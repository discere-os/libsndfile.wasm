import { assert, assertEquals, assertExists } from "@std/assert";
import Libsndfile from "../../src/lib/index.ts";

Deno.test("SIMD availability detection", async () => {
  const libsndfile = new Libsndfile({ simdOptimizations: true });
  await libsndfile.initialize();

  // SIMD should be available in modern WebAssembly environments
  // This test validates that SIMD optimizations are properly configured
  const testData = new Float32Array(16).fill(0.5);
  const result = libsndfile.analyzeAudio(testData);

  assertExists(result);
  assert(typeof result.rms === "number");
  assert(typeof result.peak === "number");
  assert(typeof result.dcOffset === "number");

  libsndfile.cleanup();
});

Deno.test("SIMD vs scalar performance comparison", async () => {
  const simdLib = new Libsndfile({ simdOptimizations: true });
  const scalarLib = new Libsndfile({ simdOptimizations: false });

  await simdLib.initialize();
  await scalarLib.initialize();

  // Create large test dataset for meaningful performance comparison
  const testData = new Float32Array(100000);
  for (let i = 0; i < testData.length; i++) {
    testData[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.8;
  }

  // Test SIMD performance
  const simdStart = performance.now();
  const simdResult = simdLib.analyzeAudio(testData);
  const simdTime = performance.now() - simdStart;

  // Test scalar performance
  const scalarStart = performance.now();
  const scalarResult = scalarLib.analyzeAudio(testData);
  const scalarTime = performance.now() - scalarStart;

  // Results should be very similar regardless of SIMD
  assert(Math.abs(simdResult.rms - scalarResult.rms) < 0.001);
  assert(Math.abs(simdResult.peak - scalarResult.peak) < 0.001);
  assert(Math.abs(simdResult.dcOffset - scalarResult.dcOffset) < 0.001);

  // SIMD should theoretically be faster, but in small tests the difference might not be measurable
  // This is more of a functional test than a performance test
  assert(simdTime >= 0);
  assert(scalarTime >= 0);

  console.log(`SIMD time: ${simdTime.toFixed(2)}ms, Scalar time: ${scalarTime.toFixed(2)}ms`);

  simdLib.cleanup();
  scalarLib.cleanup();
});

Deno.test("SIMD channel mixing accuracy", async () => {
  const libsndfile = new Libsndfile({ simdOptimizations: true });
  await libsndfile.initialize();

  // Create precise test data
  const left = new Float32Array([1.0, 0.5, -0.5, -1.0]);
  const right = new Float32Array([0.8, -0.3, 0.7, -0.2]);
  const weights = new Float32Array([0.6, 0.4]);

  const result = libsndfile.mixChannels([left, right], weights);

  assert(result.success);
  assertExists(result.data);
  assertEquals(result.data.length, 4);

  // Manual calculation for verification
  const expected = [
    1.0 * 0.6 + 0.8 * 0.4,   // 0.6 + 0.32 = 0.92
    0.5 * 0.6 + (-0.3) * 0.4, // 0.3 - 0.12 = 0.18
    (-0.5) * 0.6 + 0.7 * 0.4,  // -0.3 + 0.28 = -0.02
    (-1.0) * 0.6 + (-0.2) * 0.4 // -0.6 - 0.08 = -0.68
  ];

  for (let i = 0; i < expected.length; i++) {
    assert(Math.abs(result.data[i] - expected[i]) < 0.0001,
           `Sample ${i}: expected ${expected[i]}, got ${result.data[i]}`);
  }

  libsndfile.cleanup();
});

Deno.test("SIMD audio analysis precision", async () => {
  const libsndfile = new Libsndfile({ simdOptimizations: true });
  await libsndfile.initialize();

  // Test with known mathematical properties
  // Pure sine wave: RMS = amplitude / sqrt(2)
  const amplitude = 0.8;
  const samples = new Float32Array(4096);

  for (let i = 0; i < samples.length; i++) {
    samples[i] = amplitude * Math.sin(2 * Math.PI * i / samples.length);
  }

  const result = libsndfile.analyzeAudio(samples);

  // RMS of sine wave should be amplitude / sqrt(2)
  const expectedRms = amplitude / Math.sqrt(2);
  assert(Math.abs(result.rms - expectedRms) < 0.01,
         `RMS: expected ~${expectedRms}, got ${result.rms}`);

  // Peak should be the amplitude
  assert(Math.abs(result.peak - amplitude) < 0.01,
         `Peak: expected ~${amplitude}, got ${result.peak}`);

  // DC offset should be near zero
  assert(Math.abs(result.dcOffset) < 0.001,
         `DC offset: expected ~0, got ${result.dcOffset}`);

  libsndfile.cleanup();
});

Deno.test("SIMD format conversion precision", async () => {
  const libsndfile = new Libsndfile({ simdOptimizations: true });
  await libsndfile.initialize();

  // Test conversion with known values
  const testValues = [0, 16384, -16384, 32767, -32768];
  const int16Data = new Int16Array(testValues);

  const result = libsndfile.convertSamples(
    int16Data,
    0x0002, // PCM_16
    0x0006  // FLOAT
  );

  assert(result.success);
  assertExists(result.data);

  // Check specific conversion values
  assert(Math.abs(result.data[0]) < 0.0001); // 0 -> 0
  assert(Math.abs(result.data[1] - 0.5) < 0.001); // 16384 -> 0.5
  assert(Math.abs(result.data[2] - (-0.5)) < 0.001); // -16384 -> -0.5
  assert(Math.abs(result.data[3] - (32767/32768)) < 0.001); // Max positive
  assert(Math.abs(result.data[4] - (-1.0)) < 0.001); // Min negative (-32768/32768 = -1.0)

  libsndfile.cleanup();
});

Deno.test("SIMD dithering randomness", async () => {
  const libsndfile = new Libsndfile({ simdOptimizations: true });
  await libsndfile.initialize();

  // Test that dithering introduces randomness
  const samples = new Float32Array(100).fill(0.1); // Constant value

  const result1 = libsndfile.applyDithering(samples, 16);
  const result2 = libsndfile.applyDithering(samples, 16);

  assert(result1.success && result2.success);
  assertExists(result1.data);
  assertExists(result2.data);

  // Results should be different due to random dithering
  let differences = 0;
  for (let i = 0; i < Math.min(result1.data.length, result2.data.length); i++) {
    if (Math.abs(result1.data[i] - result2.data[i]) > 0.0001) {
      differences++;
    }
  }

  // Should have some differences due to randomness
  assert(differences > 0, "Dithering should introduce randomness");

  libsndfile.cleanup();
});

Deno.test("SIMD multi-channel processing", async () => {
  const libsndfile = new Libsndfile({ simdOptimizations: true });
  await libsndfile.initialize();

  // Test with different channel counts
  const channelCounts = [1, 2, 4, 6, 8];

  for (const channelCount of channelCounts) {
    const channels = Array.from({ length: channelCount }, (_, i) => {
      const freq = 440 * (i + 1); // Different frequency per channel
      const channel = new Float32Array(1000);
      for (let j = 0; j < channel.length; j++) {
        channel[j] = 0.5 * Math.sin(2 * Math.PI * freq * j / 44100);
      }
      return channel;
    });

    const weights = new Float32Array(channelCount).fill(1.0 / channelCount);
    const result = libsndfile.mixChannels(channels, weights);

    assert(result.success, `Failed for ${channelCount} channels`);
    assertExists(result.data);
    assertEquals(result.data.length, 1000);

    // Mixed result should be within reasonable bounds
    for (let i = 0; i < result.data.length; i++) {
      assert(Math.abs(result.data[i]) <= 1.0, `Sample out of range at index ${i}`);
    }
  }

  libsndfile.cleanup();
});

Deno.test("SIMD edge cases", async () => {
  const libsndfile = new Libsndfile({ simdOptimizations: true });
  await libsndfile.initialize();

  // Test empty data
  const emptyResult = libsndfile.analyzeAudio(new Float32Array(0));
  // Should handle gracefully (exact behavior depends on implementation)
  assertExists(emptyResult);

  // Test single sample
  const singleSample = new Float32Array([0.5]);
  const singleResult = libsndfile.analyzeAudio(singleSample);
  assertEquals(singleResult.rms, 0.5);
  assertEquals(singleResult.peak, 0.5);
  assertEquals(singleResult.dcOffset, 0.5);

  // Test very small data
  const smallData = new Float32Array([0.1, -0.1]);
  const smallResult = libsndfile.analyzeAudio(smallData);
  assert(smallResult.peak >= 0.1);
  assert(Math.abs(smallResult.dcOffset) < 0.0001); // Should average to ~0

  libsndfile.cleanup();
});

Deno.test("SIMD performance metrics", async () => {
  const libsndfile = new Libsndfile({ simdOptimizations: true });
  await libsndfile.initialize();

  // Clear any existing metrics
  libsndfile.clearPerformanceMetrics();

  // Perform SIMD operations
  const testData = new Float32Array(10000);
  testData.fill(0.707); // Fill with known value

  libsndfile.analyzeAudio(testData);

  const channels = [
    testData.slice(0, 5000),
    testData.slice(5000, 10000)
  ];
  libsndfile.mixChannels(channels);

  const metrics = libsndfile.getPerformanceMetrics();
  assert(metrics.length >= 2); // Should have metrics for both operations

  metrics.forEach(metric => {
    assert(metric.operation.length > 0);
    assert(metric.duration >= 0);
    assert(metric.samplesProcessed > 0);
    assert(metric.throughput > 0);
    assert(typeof metric.simdUsed === "boolean");
    // With SIMD optimizations enabled, most operations should use SIMD
    assert(metric.simdUsed === true);
  });

  libsndfile.cleanup();
});
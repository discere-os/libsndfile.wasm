import { assert, assertEquals, assertExists } from "@std/assert";
import Libsndfile, { AudioFormat, FileMode } from "../../src/lib/index.ts";

Deno.test("Libsndfile initialization", async () => {
  const libsndfile = new Libsndfile();
  await libsndfile.initialize();

  assertExists(libsndfile);
  assert(libsndfile.isInitialized());
  assertEquals(libsndfile.getOpenFiles().length, 0);

  libsndfile.cleanup();
});

Deno.test("Libsndfile version string", async () => {
  const libsndfile = new Libsndfile();
  await libsndfile.initialize();

  const version = libsndfile.getVersion();
  assertExists(version);
  assert(version.includes("libsndfile"));

  libsndfile.cleanup();
});

Deno.test("SIMD processing - channel mixing", async () => {
  const libsndfile = new Libsndfile({ simdOptimizations: true });
  await libsndfile.initialize();

  // Create test channels
  const left = new Float32Array([0.5, 0.3, 0.8, 0.2]);
  const right = new Float32Array([0.4, 0.6, 0.2, 0.7]);
  const weights = new Float32Array([0.6, 0.4]);

  const result = libsndfile.mixChannels([left, right], weights);

  assert(result.success);
  assertExists(result.data);
  assertEquals(result.data.length, 4);

  // Check expected mixing results
  assertEquals(result.data[0], 0.5 * 0.6 + 0.4 * 0.4); // 0.46
  assertEquals(result.data[1], 0.3 * 0.6 + 0.6 * 0.4); // 0.42

  libsndfile.cleanup();
});

Deno.test("SIMD processing - audio analysis", async () => {
  const libsndfile = new Libsndfile({ simdOptimizations: true });
  await libsndfile.initialize();

  // Create test signal: 1kHz sine wave
  const sampleRate = 44100;
  const frequency = 1000;
  const samples = new Float32Array(1024);

  for (let i = 0; i < samples.length; i++) {
    samples[i] = 0.5 * Math.sin(2 * Math.PI * frequency * i / sampleRate);
  }

  const analysis = libsndfile.analyzeAudio(samples);

  assertExists(analysis);
  assert(analysis.rms > 0.3 && analysis.rms < 0.4); // RMS of 0.5 amplitude sine wave ≈ 0.354
  assert(analysis.peak > 0.49 && analysis.peak < 0.51); // Peak should be ≈ 0.5
  assert(Math.abs(analysis.dcOffset) < 0.01); // DC offset should be near zero

  libsndfile.cleanup();
});

Deno.test("SIMD processing - format conversion", async () => {
  const libsndfile = new Libsndfile({ simdOptimizations: true });
  await libsndfile.initialize();

  // Create test int16 data
  const int16Data = new Int16Array([16384, -16384, 0, 32767, -32768]);

  const result = libsndfile.convertSamples(
    int16Data,
    AudioFormat.PCM_16,
    AudioFormat.FLOAT
  );

  assert(result.success);
  assertExists(result.data);
  assertEquals(result.data.length, 5);

  // Check conversion accuracy
  assert(Math.abs(result.data[0] - 0.5) < 0.001); // 16384/32768 ≈ 0.5
  assert(Math.abs(result.data[1] - (-0.5)) < 0.001); // -16384/32768 ≈ -0.5
  assert(Math.abs(result.data[2]) < 0.001); // 0 should remain 0
  assert(Math.abs(result.data[3] - (32767/32768)) < 0.001); // Max positive
  assert(Math.abs(result.data[4] - (-1.0)) < 0.001); // -32768/32768 = -1.0

  libsndfile.cleanup();
});

Deno.test("SIMD processing - dithering", async () => {
  const libsndfile = new Libsndfile({ simdOptimizations: true });
  await libsndfile.initialize();

  // Create test signal with very small variations
  const samples = new Float32Array(100);
  for (let i = 0; i < samples.length; i++) {
    samples[i] = 0.1 + 0.0001 * Math.sin(i * 0.1); // Small variations
  }

  const result = libsndfile.applyDithering(samples, 16);

  assert(result.success);
  assertExists(result.data);
  assertEquals(result.data.length, samples.length);

  // Dithering should introduce small random variations
  let hasDifferences = false;
  for (let i = 0; i < Math.min(10, samples.length); i++) {
    if (Math.abs(result.data[i] - samples[i]) > 0.0001) {
      hasDifferences = true;
      break;
    }
  }
  assert(hasDifferences); // Dithering should have introduced some changes

  libsndfile.cleanup();
});

Deno.test("Performance metrics tracking", async () => {
  const libsndfile = new Libsndfile({ simdOptimizations: true });
  await libsndfile.initialize();

  // Perform operations that should generate metrics
  const testData = new Float32Array(1000).fill(0.5);
  libsndfile.analyzeAudio(testData);

  const metrics = libsndfile.getPerformanceMetrics();
  assert(metrics.length > 0);

  const metric = metrics[0];
  assertExists(metric.operation);
  assert(metric.duration > 0);
  assert(metric.samplesProcessed > 0);
  assert(metric.throughput > 0);
  assertEquals(typeof metric.simdUsed, "boolean");

  // Clear metrics
  libsndfile.clearPerformanceMetrics();
  assertEquals(libsndfile.getPerformanceMetrics().length, 0);

  libsndfile.cleanup();
});

Deno.test("Error handling", async () => {
  const libsndfile = new Libsndfile();

  // Test operations before initialization
  try {
    libsndfile.getVersion();
    assert(false, "Should have thrown error");
  } catch (error) {
    assert(error.message.includes("not initialized"));
  }

  await libsndfile.initialize();

  // Test invalid channel mixing
  const invalidResult = libsndfile.mixChannels([], new Float32Array());
  assert(!invalidResult.success);
  assertExists(invalidResult.error);

  libsndfile.cleanup();
});

Deno.test("Memory management", async () => {
  const libsndfile = new Libsndfile({ maxMemoryMB: 64 });
  await libsndfile.initialize();

  // Test that library respects memory constraints
  const largeBuffer = new Float32Array(1000000); // ~4MB
  const result = libsndfile.analyzeAudio(largeBuffer);

  assert(result); // Should handle large buffers within limits

  libsndfile.cleanup();

  // After cleanup, should not be initialized
  assert(!libsndfile.isInitialized());
  assertEquals(libsndfile.getOpenFiles().length, 0);
});
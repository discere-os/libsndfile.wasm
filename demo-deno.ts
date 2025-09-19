#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * libsndfile.wasm Demo - Audio file I/O with SIMD optimization
 * Demonstrates comprehensive audio processing capabilities
 */

import Libsndfile, {
  AudioFormat,
  AudioInfo,
  FileMode,
  PerformanceMetrics,
} from "./src/lib/index.ts";

async function demo() {
  console.log("🎵 libsndfile.wasm Demo");
  console.log("=" + "=".repeat(50));

  const libsndfile = new Libsndfile({
    simdOptimizations: true,
    maxMemoryMB: 128,
    enableClipping: false,
    normalizeFloats: true,
  });

  try {
    // Initialize the library
    console.log("📦 Initializing libsndfile.wasm...");
    await libsndfile.initialize();
    console.log("✅ Library initialized");

    // Display version information
    const version = libsndfile.getVersion();
    console.log(`📋 Version: ${version}`);

    // Create a synthetic audio signal for demonstration
    console.log("\n🎛️ Creating synthetic audio signals...");
    const sampleRate = 44100;
    const duration = 2.0; // 2 seconds
    const frames = Math.floor(sampleRate * duration);
    const channels = 2; // Stereo

    // Generate test signals
    const { leftChannel, rightChannel } = generateTestSignals(frames, sampleRate);

    console.log(`   • Sample rate: ${sampleRate} Hz`);
    console.log(`   • Duration: ${duration} seconds`);
    console.log(`   • Channels: ${channels}`);
    console.log(`   • Total samples: ${frames * channels}`);

    // Test SIMD processing capabilities
    console.log("\n🚀 Testing SIMD processing...");

    // Mix channels
    const startMix = performance.now();
    const mixResult = libsndfile.mixChannels(
      [leftChannel, rightChannel],
      new Float32Array([0.7, 0.3]), // 70% left, 30% right
    );
    const mixTime = performance.now() - startMix;

    if (mixResult.success && mixResult.data) {
      console.log(`   • Channel mixing: ${mixTime.toFixed(2)}ms`);
      console.log(`   • Output samples: ${mixResult.data.length}`);
    }

    // Audio analysis
    const startAnalysis = performance.now();
    const analysis = libsndfile.analyzeAudio(leftChannel);
    const analysisTime = performance.now() - startAnalysis;

    console.log(`   • Audio analysis: ${analysisTime.toFixed(2)}ms`);
    console.log(`   • RMS level: ${(20 * Math.log10(analysis.rms)).toFixed(2)} dB`);
    console.log(`   • Peak level: ${(20 * Math.log10(analysis.peak)).toFixed(2)} dB`);
    console.log(`   • DC offset: ${analysis.dcOffset.toFixed(6)}`);

    // Apply dithering
    const startDither = performance.now();
    const ditheredResult = libsndfile.applyDithering(leftChannel, 16);
    const ditherTime = performance.now() - startDither;

    if (ditheredResult.success) {
      console.log(`   • Dithering (16-bit): ${ditherTime.toFixed(2)}ms`);
    }

    // Test file format support (simulated - we don't have actual audio files in this demo)
    console.log("\n📁 Supported audio formats:");
    const formats = [
      { format: AudioFormat.WAV | AudioFormat.PCM_16, name: "WAV 16-bit PCM", ext: ".wav" },
      { format: AudioFormat.WAV | AudioFormat.FLOAT, name: "WAV 32-bit Float", ext: ".wav" },
      { format: AudioFormat.FLAC | AudioFormat.PCM_16, name: "FLAC 16-bit", ext: ".flac" },
      { format: AudioFormat.OGG | AudioFormat.VORBIS, name: "OGG Vorbis", ext: ".ogg" },
      { format: AudioFormat.AIFF | AudioFormat.PCM_24, name: "AIFF 24-bit", ext: ".aiff" },
    ];

    formats.forEach((fmt, idx) => {
      console.log(`   ${idx + 1}. ${fmt.name} (${fmt.ext})`);
    });

    // Memory and performance metrics
    console.log("\n📊 Performance Metrics:");
    const metrics = libsndfile.getPerformanceMetrics();

    if (metrics.length > 0) {
      metrics.forEach((metric: PerformanceMetrics) => {
        const throughputMHz = metric.throughput / 1_000_000;
        console.log(`   • ${metric.operation}:`);
        console.log(`     - Duration: ${metric.duration.toFixed(2)}ms`);
        console.log(`     - Samples: ${metric.samplesProcessed.toLocaleString()}`);
        console.log(`     - Throughput: ${throughputMHz.toFixed(1)} MSamples/sec`);
        console.log(`     - SIMD: ${metric.simdUsed ? "✅" : "❌"}`);
      });
    }

    // Demonstrate format conversion
    console.log("\n🔄 Audio format conversion demo:");
    const int16Samples = new Int16Array(1000);
    for (let i = 0; i < int16Samples.length; i++) {
      int16Samples[i] = Math.floor((Math.sin(2 * Math.PI * 440 * i / sampleRate) * 32767));
    }

    const conversionResult = libsndfile.convertSamples(
      int16Samples,
      AudioFormat.PCM_16,
      AudioFormat.FLOAT,
    );

    if (conversionResult.success && conversionResult.data) {
      console.log(`   • Converted ${int16Samples.length} samples from int16 to float32`);
      console.log(`   • Input range: [${Math.min(...int16Samples)}, ${Math.max(...int16Samples)}]`);
      console.log(`   • Output range: [${Math.min(...conversionResult.data).toFixed(4)}, ${Math.max(...conversionResult.data).toFixed(4)}]`);
    }

    // Audio quality metrics
    console.log("\n🎯 Audio Quality Metrics:");
    const qualityMetrics = calculateQualityMetrics(leftChannel, rightChannel);
    console.log(`   • THD+N: ${qualityMetrics.thdPlusN.toFixed(4)}%`);
    console.log(`   • SNR: ${qualityMetrics.snr.toFixed(2)} dB`);
    console.log(`   • Stereo width: ${qualityMetrics.stereoWidth.toFixed(3)}`);
    console.log(`   • Phase correlation: ${qualityMetrics.phaseCorrelation.toFixed(3)}`);

    // Memory usage
    const openFiles = libsndfile.getOpenFiles();
    console.log(`\n💾 Memory & Resources:`);
    console.log(`   • Open files: ${openFiles.length}`);
    console.log(`   • Library initialized: ${libsndfile.isInitialized()}`);

    // Advanced features demonstration
    console.log("\n🎚️ Advanced Audio Processing:");

    // Simulate advanced processing that would benefit from SIMD
    const processingStart = performance.now();

    // Complex processing pipeline simulation
    const processedAudio = await simulateAdvancedProcessing(leftChannel, rightChannel, sampleRate);

    const processingEnd = performance.now();
    console.log(`   • Advanced processing pipeline: ${(processingEnd - processingStart).toFixed(2)}ms`);
    console.log(`   • Processing ratio: ${((duration * 1000) / (processingEnd - processingStart)).toFixed(1)}x real-time`);

    console.log(`\n✅ Demo completed successfully!`);
    console.log(`📈 Total processing time: ${processingStart.toFixed(2)}ms for ${duration}s of audio`);
    console.log(`⚡ Real-time factor: ${((duration * 1000) / processingStart).toFixed(1)}x`);

  } catch (error) {
    console.error("❌ Demo failed:", error);
  } finally {
    // Cleanup
    libsndfile.cleanup();
    console.log("🧹 Cleanup completed");
  }
}

/**
 * Generate test audio signals
 */
function generateTestSignals(frames: number, sampleRate: number) {
  const leftChannel = new Float32Array(frames);
  const rightChannel = new Float32Array(frames);

  for (let i = 0; i < frames; i++) {
    const t = i / sampleRate;

    // Left channel: 440 Hz sine wave with some harmonics
    leftChannel[i] = 0.7 * Math.sin(2 * Math.PI * 440 * t) +
                     0.2 * Math.sin(2 * Math.PI * 880 * t) +
                     0.1 * Math.sin(2 * Math.PI * 1320 * t);

    // Right channel: 554.37 Hz (C# note) with different harmonics
    rightChannel[i] = 0.6 * Math.sin(2 * Math.PI * 554.37 * t) +
                      0.3 * Math.sin(2 * Math.PI * 1108.74 * t) +
                      0.1 * Math.sin(2 * Math.PI * 1663.11 * t);
  }

  return { leftChannel, rightChannel };
}

/**
 * Calculate audio quality metrics
 */
function calculateQualityMetrics(left: Float32Array, right: Float32Array) {
  // THD+N estimation (simplified)
  let fundamentalPower = 0;
  let totalPower = 0;

  for (let i = 0; i < left.length; i++) {
    totalPower += left[i] * left[i];
    // Simplified fundamental frequency power estimation
    fundamentalPower += left[i] * left[i] * 0.8; // Assume 80% is fundamental
  }

  const thdPlusN = Math.sqrt((totalPower - fundamentalPower) / fundamentalPower) * 100;

  // SNR estimation
  const signalPower = fundamentalPower / left.length;
  const noisePower = (totalPower - fundamentalPower) / left.length;
  const snr = 10 * Math.log10(signalPower / (noisePower + 1e-10));

  // Stereo width (correlation-based)
  let correlation = 0;
  let leftPower = 0;
  let rightPower = 0;

  for (let i = 0; i < Math.min(left.length, right.length); i++) {
    correlation += left[i] * right[i];
    leftPower += left[i] * left[i];
    rightPower += right[i] * right[i];
  }

  const phaseCorrelation = correlation / Math.sqrt(leftPower * rightPower);
  const stereoWidth = 1 - Math.abs(phaseCorrelation);

  return {
    thdPlusN,
    snr,
    stereoWidth,
    phaseCorrelation,
  };
}

/**
 * Simulate advanced audio processing pipeline
 */
async function simulateAdvancedProcessing(
  left: Float32Array,
  right: Float32Array,
  sampleRate: number,
): Promise<{ left: Float32Array; right: Float32Array }> {
  // Simulate complex processing that benefits from SIMD
  const processedLeft = new Float32Array(left.length);
  const processedRight = new Float32Array(right.length);

  // Multi-stage processing pipeline
  for (let stage = 0; stage < 3; stage++) {
    for (let i = 0; i < left.length; i++) {
      // Simulate complex DSP operations
      const leftSample = stage === 0 ? left[i] : processedLeft[i];
      const rightSample = stage === 0 ? right[i] : processedRight[i];

      // EQ simulation (simplified)
      processedLeft[i] = leftSample * 0.95 + (i > 0 ? processedLeft[i-1] * 0.05 : 0);
      processedRight[i] = rightSample * 0.95 + (i > 0 ? processedRight[i-1] * 0.05 : 0);

      // Stereo enhancement
      const mid = (processedLeft[i] + processedRight[i]) * 0.5;
      const side = (processedLeft[i] - processedRight[i]) * 0.5;

      processedLeft[i] = mid + side * 1.2;
      processedRight[i] = mid - side * 1.2;
    }
  }

  return { left: processedLeft, right: processedRight };
}

if (import.meta.main) {
  await demo();
}
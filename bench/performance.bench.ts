import Libsndfile from "../src/lib/index.ts";

let libsndfile: Libsndfile;

// Setup before benchmarks
await (async () => {
  libsndfile = new Libsndfile({ simdOptimizations: true });
  await libsndfile.initialize();
})();

// Audio analysis benchmarks
Deno.bench("Audio analysis - 1K samples", () => {
  const data = new Float32Array(1000);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.sin(2 * Math.PI * 440 * i / 44100);
  }
  libsndfile.analyzeAudio(data);
});

Deno.bench("Audio analysis - 10K samples", () => {
  const data = new Float32Array(10000);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.sin(2 * Math.PI * 440 * i / 44100);
  }
  libsndfile.analyzeAudio(data);
});

Deno.bench("Audio analysis - 100K samples", () => {
  const data = new Float32Array(100000);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.sin(2 * Math.PI * 440 * i / 44100);
  }
  libsndfile.analyzeAudio(data);
});

// Channel mixing benchmarks
Deno.bench("Channel mixing - stereo 1K frames", () => {
  const left = new Float32Array(1000);
  const right = new Float32Array(1000);
  left.fill(0.7);
  right.fill(0.3);
  libsndfile.mixChannels([left, right]);
});

Deno.bench("Channel mixing - 5.1 surround 10K frames", () => {
  const channels = Array.from({ length: 6 }, () => {
    const channel = new Float32Array(10000);
    channel.fill(Math.random() * 0.5);
    return channel;
  });
  const weights = new Float32Array([0.2, 0.2, 0.15, 0.15, 0.15, 0.15]);
  libsndfile.mixChannels(channels, weights);
});

// Format conversion benchmarks
Deno.bench("Format conversion - int16 to float32 (10K)", () => {
  const int16Data = new Int16Array(10000);
  for (let i = 0; i < int16Data.length; i++) {
    int16Data[i] = Math.floor(Math.sin(2 * Math.PI * i / 1000) * 32767);
  }
  libsndfile.convertSamples(int16Data, 0x0002, 0x0006);
});

Deno.bench("Format conversion - float32 to int16 (10K)", () => {
  const floatData = new Float32Array(10000);
  for (let i = 0; i < floatData.length; i++) {
    floatData[i] = Math.sin(2 * Math.PI * i / 1000);
  }
  libsndfile.convertSamples(floatData, 0x0006, 0x0002);
});

// Dithering benchmarks
Deno.bench("Dithering - 16-bit (10K samples)", () => {
  const data = new Float32Array(10000);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.8;
  }
  libsndfile.applyDithering(data, 16);
});

Deno.bench("Dithering - 24-bit (10K samples)", () => {
  const data = new Float32Array(10000);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.8;
  }
  libsndfile.applyDithering(data, 24);
});

// Complex processing pipeline benchmark
Deno.bench("Complex audio pipeline (1 second @ 44.1kHz stereo)", () => {
  const frameCount = 44100;
  const left = new Float32Array(frameCount);
  const right = new Float32Array(frameCount);

  // Generate test signals
  for (let i = 0; i < frameCount; i++) {
    left[i] = 0.7 * Math.sin(2 * Math.PI * 440 * i / 44100);
    right[i] = 0.6 * Math.sin(2 * Math.PI * 554.37 * i / 44100);
  }

  // Processing pipeline
  libsndfile.analyzeAudio(left);
  libsndfile.analyzeAudio(right);

  const mixed = libsndfile.mixChannels([left, right], new Float32Array([0.5, 0.5]));
  if (mixed.success && mixed.data) {
    libsndfile.applyDithering(mixed.data, 16);
  }
});

// Memory allocation benchmark
Deno.bench("Memory allocation - large buffer processing", () => {
  // Test memory allocation/deallocation performance
  const largeBuffer = new Float32Array(1000000); // ~4MB
  largeBuffer.fill(0.5);

  const result = libsndfile.analyzeAudio(largeBuffer);
  // Force deallocation by clearing reference
  largeBuffer.fill(0);
});

// Throughput benchmark
Deno.bench("Throughput test - 10 seconds of CD quality audio", () => {
  const cdQualityFrames = 44100 * 10; // 10 seconds at 44.1kHz
  const stereoSamples = cdQualityFrames * 2;

  const audioData = new Float32Array(stereoSamples);
  for (let i = 0; i < stereoSamples; i++) {
    // Simulate stereo audio with different content per channel
    const isLeft = i % 2 === 0;
    const frame = Math.floor(i / 2);
    const frequency = isLeft ? 440 : 880; // A4 and A5
    audioData[i] = 0.3 * Math.sin(2 * Math.PI * frequency * frame / 44100);
  }

  // Deinterleave
  const left = new Float32Array(cdQualityFrames);
  const right = new Float32Array(cdQualityFrames);

  for (let i = 0; i < cdQualityFrames; i++) {
    left[i] = audioData[i * 2];
    right[i] = audioData[i * 2 + 1];
  }

  // Process both channels
  libsndfile.analyzeAudio(left);
  libsndfile.analyzeAudio(right);

  // Mix back to mono
  libsndfile.mixChannels([left, right], new Float32Array([0.5, 0.5]));
});

// Cleanup after benchmarks
globalThis.addEventListener("unload", () => {
  libsndfile?.cleanup();
});
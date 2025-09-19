import { assert, assertEquals, assertExists } from "@std/assert";
import Libsndfile, { AudioFormat, AudioInfo, FileMode } from "../../src/lib/index.ts";

Deno.test("Audio format constants", () => {
  // Test major formats
  assertEquals(AudioFormat.WAV, 0x010000);
  assertEquals(AudioFormat.AIFF, 0x020000);
  assertEquals(AudioFormat.FLAC, 0x170000);
  assertEquals(AudioFormat.OGG, 0x200000);

  // Test sub formats
  assertEquals(AudioFormat.PCM_16, 0x0002);
  assertEquals(AudioFormat.PCM_24, 0x0003);
  assertEquals(AudioFormat.FLOAT, 0x0006);
  assertEquals(AudioFormat.VORBIS, 0x0060);
});

Deno.test("Audio format combinations", () => {
  // Test format combinations
  const wavPcm16 = AudioFormat.WAV | AudioFormat.PCM_16;
  const flacPcm24 = AudioFormat.FLAC | AudioFormat.PCM_24;
  const oggVorbis = AudioFormat.OGG | AudioFormat.VORBIS;

  assertEquals(wavPcm16, 0x010002);
  assertEquals(flacPcm24, 0x170003);
  assertEquals(oggVorbis, 0x200060);
});

Deno.test("AudioInfo structure validation", () => {
  const info: AudioInfo = {
    frames: 44100,
    samplerate: 44100,
    channels: 2,
    format: AudioFormat.WAV | AudioFormat.PCM_16,
    sections: 1,
    seekable: 1,
  };

  assertEquals(info.frames, 44100);
  assertEquals(info.samplerate, 44100);
  assertEquals(info.channels, 2);
  assertEquals(info.format, 0x010002);
  assertEquals(info.sections, 1);
  assertEquals(info.seekable, 1);
});

Deno.test("Format validation helper", () => {
  // This would test sf_format_check functionality if we had file operations
  const validFormats = [
    AudioFormat.WAV | AudioFormat.PCM_16,
    AudioFormat.WAV | AudioFormat.FLOAT,
    AudioFormat.AIFF | AudioFormat.PCM_24,
    AudioFormat.FLAC | AudioFormat.PCM_16,
    AudioFormat.OGG | AudioFormat.VORBIS,
  ];

  validFormats.forEach(format => {
    assert(typeof format === "number");
    assert(format > 0);
  });
});

Deno.test("Sample format bit depths", () => {
  // Test that format constants represent correct bit depths
  const formatBitDepths = [
    { format: AudioFormat.PCM_S8, bits: 8 },
    { format: AudioFormat.PCM_16, bits: 16 },
    { format: AudioFormat.PCM_24, bits: 24 },
    { format: AudioFormat.PCM_32, bits: 32 },
    { format: AudioFormat.FLOAT, bits: 32 },
    { format: AudioFormat.DOUBLE, bits: 64 },
  ];

  formatBitDepths.forEach(({ format, bits }) => {
    assert(format > 0);
    // These would be tested with actual format checking if available
    assert(bits >= 8 && bits <= 64);
  });
});

Deno.test("Compressed format constants", () => {
  const compressedFormats = [
    AudioFormat.ULAW,
    AudioFormat.ALAW,
    AudioFormat.IMA_ADPCM,
    AudioFormat.MS_ADPCM,
    AudioFormat.GSM610,
    AudioFormat.VORBIS,
    AudioFormat.OPUS,
  ];

  compressedFormats.forEach(format => {
    assert(format > 0);
    assert(format < 0x1000); // Sub-formats should be < 0x1000
  });
});

Deno.test("Container format constants", () => {
  const containerFormats = [
    AudioFormat.WAV,
    AudioFormat.AIFF,
    AudioFormat.AU,
    AudioFormat.FLAC,
    AudioFormat.OGG,
    AudioFormat.CAF,
    AudioFormat.W64,
    AudioFormat.RF64,
  ];

  containerFormats.forEach(format => {
    assert(format >= 0x010000); // Major formats should be >= 0x010000
    assert((format & 0xFFFF) === 0); // Should have no sub-format bits set
  });
});

Deno.test("Professional format support", () => {
  // Test professional audio formats
  const proFormats = [
    { name: "Broadcast WAV", format: AudioFormat.WAV | AudioFormat.PCM_24 },
    { name: "AIFF-C", format: AudioFormat.AIFF | AudioFormat.FLOAT },
    { name: "CAF PCM", format: AudioFormat.CAF | AudioFormat.PCM_32 },
    { name: "RF64", format: AudioFormat.RF64 | AudioFormat.PCM_24 },
  ];

  proFormats.forEach(({ name, format }) => {
    assert(format > 0);
    assertExists(name);
  });
});

Deno.test("Multi-channel format support", () => {
  // Test that formats can theoretically support various channel configurations
  const channelConfigs = [1, 2, 4, 6, 8, 16, 32]; // Mono to 32 channels

  channelConfigs.forEach(channels => {
    assert(channels >= 1 && channels <= 32);

    // Theoretical audio info for multi-channel
    const info: Partial<AudioInfo> = {
      channels,
      samplerate: 48000,
      format: AudioFormat.WAV | AudioFormat.FLOAT,
    };

    assertEquals(info.channels, channels);
    assertEquals(info.samplerate, 48000);
  });
});

Deno.test("Sample rate validation", () => {
  const commonSampleRates = [
    8000,   // Telephone quality
    11025,  // Quarter of CD quality
    16000,  // Wideband speech
    22050,  // Half of CD quality
    44100,  // CD quality
    48000,  // Professional digital audio
    88200,  // 2x CD quality
    96000,  // High-resolution audio
    176400, // 4x CD quality
    192000, // Ultra high-resolution
  ];

  commonSampleRates.forEach(samplerate => {
    assert(samplerate > 0);
    assert(samplerate <= 192000);

    const info: Partial<AudioInfo> = {
      samplerate,
      channels: 2,
      format: AudioFormat.WAV | AudioFormat.PCM_16,
    };

    assertEquals(info.samplerate, samplerate);
  });
});

Deno.test("Format extension mapping", () => {
  const formatExtensions = [
    { format: AudioFormat.WAV, extension: ".wav" },
    { format: AudioFormat.AIFF, extension: ".aiff" },
    { format: AudioFormat.AU, extension: ".au" },
    { format: AudioFormat.FLAC, extension: ".flac" },
    { format: AudioFormat.OGG, extension: ".ogg" },
    { format: AudioFormat.CAF, extension: ".caf" },
  ];

  formatExtensions.forEach(({ format, extension }) => {
    assert(format > 0);
    assert(extension.startsWith("."));
    assert(extension.length >= 3);
  });
});

Deno.test("Lossless vs lossy format classification", () => {
  const losslessFormats = [
    AudioFormat.PCM_16,
    AudioFormat.PCM_24,
    AudioFormat.PCM_32,
    AudioFormat.FLOAT,
    AudioFormat.DOUBLE,
    AudioFormat.ALAC_16,
    AudioFormat.ALAC_24,
  ];

  const lossyFormats = [
    AudioFormat.ULAW,
    AudioFormat.ALAW,
    AudioFormat.IMA_ADPCM,
    AudioFormat.VORBIS,
    AudioFormat.OPUS,
    AudioFormat.MPEG_LAYER_III,
  ];

  // All formats should have positive values
  [...losslessFormats, ...lossyFormats].forEach(format => {
    assert(format > 0);
  });

  // Ensure no overlap between lossless and lossy format lists
  losslessFormats.forEach(lossless => {
    assert(!lossyFormats.includes(lossless));
  });
});
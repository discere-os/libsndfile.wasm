/**
 * WebAssembly port of libsndfile - Audio file I/O library types
 * Copyright (c) 1999-2023 Erik de Castro Lopo <erikd@mega-nerd.com>
 * Copyright (c) 2023 libsndfile team
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under LGPL-2.1
 */

// Audio file formats supported by libsndfile
export enum AudioFormat {
  // Major formats
  WAV = 0x010000, // Microsoft WAV format
  AIFF = 0x020000, // Apple/SGI AIFF format
  AU = 0x030000, // Sun/NeXT AU format
  RAW = 0x040000, // RAW PCM data
  PAF = 0x050000, // Ensoniq PARIS file format
  SVX = 0x060000, // Amiga IFF / SVX8 / SV16 format
  NIST = 0x070000, // Sphere NIST format
  VOC = 0x080000, // VOC files
  IRCAM = 0x0A0000, // Berkeley/IRCAM/CARL
  W64 = 0x0B0000, // Sonic Foundry's 64 bit RIFF/WAV
  MAT4 = 0x0C0000, // Matlab (tm) V4.2 / GNU Octave 2.0
  MAT5 = 0x0D0000, // Matlab (tm) V5.0 / GNU Octave 2.1
  PVF = 0x0E0000, // Portable Voice Format
  XI = 0x0F0000, // Fasttracker 2 Extended Instrument
  HTK = 0x100000, // HMM Tool Kit format
  SDS = 0x110000, // Midi Sample Dump Standard
  AVR = 0x120000, // Audio Visual Research
  WAVEX = 0x130000, // MS WAVE with WAVEFORMATEX
  SD2 = 0x160000, // Sound Designer 2
  FLAC = 0x170000, // FLAC lossless file format
  CAF = 0x180000, // Core Audio File format
  WVE = 0x190000, // Psion WVE format
  OGG = 0x200000, // Xiph OGG container
  MPC2K = 0x210000, // Akai MPC 2000 sampler
  RF64 = 0x220000, // RF64 WAV file
  MPEG = 0x230000, // MPEG-1/2 audio stream

  // Sub formats
  PCM_S8 = 0x0001, // Signed 8 bit data
  PCM_16 = 0x0002, // Signed 16 bit data
  PCM_24 = 0x0003, // Signed 24 bit data
  PCM_32 = 0x0004, // Signed 32 bit data
  PCM_U8 = 0x0005, // Unsigned 8 bit data
  FLOAT = 0x0006, // 32 bit float data
  DOUBLE = 0x0007, // 64 bit float data
  ULAW = 0x0010, // U-Law encoded
  ALAW = 0x0011, // A-Law encoded
  IMA_ADPCM = 0x0012, // IMA ADPCM
  MS_ADPCM = 0x0013, // Microsoft ADPCM
  GSM610 = 0x0020, // GSM 6.10 encoding
  VOX_ADPCM = 0x0021, // Oki Dialogic ADPCM encoding
  NMS_ADPCM_16 = 0x0022, // 16kbs NMS G721-variant encoding
  NMS_ADPCM_24 = 0x0023, // 24kbs NMS G721-variant encoding
  NMS_ADPCM_32 = 0x0024, // 32kbs NMS G721-variant encoding
  G721_32 = 0x0030, // 32kbs G721 ADPCM encoding
  G723_24 = 0x0031, // 24kbs G723 ADPCM encoding
  G723_40 = 0x0032, // 40kbs G723 ADPCM encoding
  DWVW_12 = 0x0040, // 12 bit Delta Width Variable Word encoding
  DWVW_16 = 0x0041, // 16 bit Delta Width Variable Word encoding
  DWVW_24 = 0x0042, // 24 bit Delta Width Variable Word encoding
  DWVW_N = 0x0043, // N bit Delta Width Variable Word encoding
  DPCM_8 = 0x0050, // 8 bit differential PCM (XI only)
  DPCM_16 = 0x0051, // 16 bit differential PCM (XI only)
  VORBIS = 0x0060, // Xiph Vorbis encoding
  OPUS = 0x0064, // Xiph/Skype Opus encoding
  ALAC_16 = 0x0070, // Apple Lossless Audio Codec (16 bit)
  ALAC_20 = 0x0071, // Apple Lossless Audio Codec (20 bit)
  ALAC_24 = 0x0072, // Apple Lossless Audio Codec (24 bit)
  ALAC_32 = 0x0073, // Apple Lossless Audio Codec (32 bit)
  MPEG_LAYER_I = 0x0080, // MPEG-1 Audio Layer I
  MPEG_LAYER_II = 0x0081, // MPEG-1 Audio Layer II
  MPEG_LAYER_III = 0x0082, // MPEG-1 Audio Layer III
}

// Endian-ness options
export enum Endianness {
  FILE = 0x00000000, // Default file endian-ness
  LITTLE = 0x10000000, // Force little endian-ness
  BIG = 0x20000000, // Force big endian-ness
  CPU = 0x30000000, // Force CPU endian-ness
}

// Seek whence values
export enum SeekMode {
  SET = 0, // The offset is set to offset bytes from the start of the audio data
  CUR = 1, // The offset is set to its current location plus offset bytes
  END = 2, // The offset is set to the length of the audio data plus offset bytes
}

// String types for metadata
export enum StringType {
  TITLE = 0x01,
  COPYRIGHT = 0x02,
  SOFTWARE = 0x03,
  ARTIST = 0x04,
  COMMENT = 0x05,
  DATE = 0x06,
  ALBUM = 0x07,
  LICENSE = 0x08,
  TRACKNUMBER = 0x09,
  GENRE = 0x10,
}

// Command constants for sf_command
export enum Command {
  GET_LIB_VERSION = 0x1000,
  GET_LOG_INFO = 0x1001,
  GET_CURRENT_SF_INFO = 0x1002,
  GET_NORM_DOUBLE = 0x1010,
  GET_NORM_FLOAT = 0x1011,
  SET_NORM_DOUBLE = 0x1012,
  SET_NORM_FLOAT = 0x1013,
  SET_SCALE_FLOAT_INT_READ = 0x1014,
  SET_SCALE_INT_FLOAT_WRITE = 0x1015,
  GET_SIMPLE_FORMAT_COUNT = 0x1020,
  GET_SIMPLE_FORMAT = 0x1021,
  GET_FORMAT_INFO = 0x1028,
  GET_FORMAT_MAJOR_COUNT = 0x1030,
  GET_FORMAT_MAJOR = 0x1031,
  GET_FORMAT_SUBTYPE_COUNT = 0x1032,
  GET_FORMAT_SUBTYPE = 0x1033,
  CALC_SIGNAL_MAX = 0x1040,
  CALC_NORM_SIGNAL_MAX = 0x1041,
  CALC_MAX_ALL_CHANNELS = 0x1042,
  CALC_NORM_MAX_ALL_CHANNELS = 0x1043,
  GET_SIGNAL_MAX = 0x1044,
  GET_MAX_ALL_CHANNELS = 0x1045,
  SET_ADD_PEAK_CHUNK = 0x1050,
  UPDATE_HEADER_NOW = 0x1060,
  SET_UPDATE_HEADER_AUTO = 0x1061,
  FILE_TRUNCATE = 0x1080,
  SET_RAW_START_OFFSET = 0x1090,
  SET_DITHER_ON_WRITE = 0x10A0,
  SET_DITHER_ON_READ = 0x10A1,
  GET_DITHER_INFO_COUNT = 0x10A2,
  GET_DITHER_INFO = 0x10A3,
  GET_EMBED_FILE_INFO = 0x10B0,
  SET_CLIPPING = 0x10C0,
  GET_CLIPPING = 0x10C1,
  GET_CUE_COUNT = 0x10CD,
  GET_CUE = 0x10CE,
  SET_CUE = 0x10CF,
  GET_INSTRUMENT = 0x10D0,
  SET_INSTRUMENT = 0x10D1,
  GET_LOOP_INFO = 0x10E0,
  GET_BROADCAST_INFO = 0x10F0,
  SET_BROADCAST_INFO = 0x10F1,
  GET_CHANNEL_MAP_INFO = 0x1100,
  SET_CHANNEL_MAP_INFO = 0x1101,
  RAW_DATA_NEEDS_ENDSWAP = 0x1110,
  WAVEX_SET_AMBISONIC = 0x1200,
  WAVEX_GET_AMBISONIC = 0x1201,
  RF64_AUTO_DOWNGRADE = 0x1210,
  SET_VBR_ENCODING_QUALITY = 0x1300,
  SET_COMPRESSION_LEVEL = 0x1301,
}

// Audio file information structure
export interface AudioInfo {
  frames: number; // Number of frames (samples per channel)
  samplerate: number; // Sample rate in Hz
  channels: number; // Number of channels
  format: number; // Format type (combination of major and sub format)
  sections: number; // Number of sections in file
  seekable: number; // True if file supports seeking
}

// Options for libsndfile operations
export interface LibsndfileOptions {
  simdOptimizations?: boolean; // Enable SIMD optimizations
  maxMemoryMB?: number; // Maximum memory usage in MB
  enableClipping?: boolean; // Enable/disable clipping
  normalizeFloats?: boolean; // Normalize float values
}

// Result from audio operations
export interface AudioResult<T = Float32Array> {
  success: boolean;
  data?: T;
  framesRead?: number;
  framesWritten?: number;
  error?: string;
  errorCode?: number;
}

// Format information structure
export interface FormatInfo {
  format: number;
  name: string;
  extension: string;
}

// Simple format structure
export interface SimpleFormat {
  format: number;
  name: string;
  extension: string;
}

// Peak chunk information
export interface PeakInfo {
  version: number;
  timestamp: number;
  peaks: Float64Array;
}

// Broadcast extension chunk
export interface BroadcastInfo {
  description: string;
  originator: string;
  originator_reference: string;
  origination_date: string;
  origination_time: string;
  time_reference_low: number;
  time_reference_high: number;
  version: number;
  umid: string;
  reserved: string;
  coding_history_size: number;
  coding_history: string;
}

// Audio processing functions with SIMD optimization
export interface SIMDProcessing {
  /**
   * Convert audio samples with SIMD acceleration
   * @param input Input samples
   * @param inputFormat Source format
   * @param outputFormat Target format
   * @returns Converted samples
   */
  convertSamples(
    input: ArrayLike<number>,
    inputFormat: AudioFormat,
    outputFormat: AudioFormat,
  ): AudioResult<Float32Array>;

  /**
   * Mix multiple audio channels with SIMD
   * @param channels Array of channel data
   * @param weights Mixing weights per channel
   * @returns Mixed audio result
   */
  mixChannels(
    channels: Float32Array[],
    weights?: Float32Array,
  ): AudioResult<Float32Array>;

  /**
   * Apply dithering with SIMD optimization
   * @param samples Input samples
   * @param targetBits Target bit depth
   * @returns Dithered samples
   */
  applyDithering(
    samples: Float32Array,
    targetBits: number,
  ): AudioResult<Float32Array>;

  /**
   * Calculate RMS and peak values with SIMD
   * @param samples Input samples
   * @returns Analysis result with RMS and peak values
   */
  analyzeAudio(samples: Float32Array): {
    rms: number;
    peak: number;
    dcOffset: number;
  };
}

// Performance metrics for benchmarking
export interface PerformanceMetrics {
  operation: string;
  duration: number; // Duration in milliseconds
  samplesProcessed: number;
  throughput: number; // Samples per second
  simdUsed: boolean;
  memoryUsed: number; // Memory usage in bytes
}

// Audio file handle (opaque pointer)
export type SndFile = number;

// Error codes
export enum ErrorCode {
  NO_ERROR = 0,
  UNRECOGNISED_FORMAT = 1,
  SYSTEM = 2,
  MALFORMED_FILE = 3,
  UNSUPPORTED_ENCODING = 4,
}

// Type aliases for different sample formats
export type AudioSamplesInt16 = Int16Array;
export type AudioSamplesInt32 = Int32Array;
export type AudioSamplesFloat32 = Float32Array;
export type AudioSamplesFloat64 = Float64Array;

// Union type for all supported sample formats
export type AudioSamples =
  | AudioSamplesInt16
  | AudioSamplesInt32
  | AudioSamplesFloat32
  | AudioSamplesFloat64;

// File modes for opening audio files
export enum FileMode {
  READ = 0x10, // Read only mode
  WRITE = 0x20, // Write only mode
  RDWR = 0x30, // Read/Write mode
}

// Channel map information
export enum ChannelMap {
  INVALID = 0,
  MONO = 1,
  LEFT = 2,
  RIGHT = 3,
  CENTER = 4,
  FRONT_LEFT = 5,
  FRONT_RIGHT = 6,
  FRONT_CENTER = 7,
  REAR_CENTER = 8,
  REAR_LEFT = 9,
  REAR_RIGHT = 10,
  LFE = 11,
  FRONT_LEFT_OF_CENTER = 12,
  FRONT_RIGHT_OF_CENTER = 13,
  SIDE_LEFT = 14,
  SIDE_RIGHT = 15,
  TOP_CENTER = 16,
  TOP_FRONT_LEFT = 17,
  TOP_FRONT_RIGHT = 18,
  TOP_FRONT_CENTER = 19,
  TOP_REAR_LEFT = 20,
  TOP_REAR_RIGHT = 21,
  TOP_REAR_CENTER = 22,
  AMBISONIC_B_W = 23,
  AMBISONIC_B_X = 24,
  AMBISONIC_B_Y = 25,
  AMBISONIC_B_Z = 26,
}

// Virtual I/O function types
export interface VirtualIO {
  get_filelen(): number;
  seek(offset: number, whence: SeekMode): number;
  read(ptr: number, count: number): number;
  write(ptr: number, count: number): number;
  tell(): number;
}

// Dithering types
export enum DitherType {
  NO_DITHER = 0,
  WHITE = 1,
  TRIANGULAR_PDF = 2,
}

export type { AudioResult, AudioInfo, LibsndfileOptions };
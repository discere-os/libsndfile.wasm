/*
 * SIMD-optimized audio processing functions for libsndfile.wasm
 * Copyright (c) 1999-2023 Erik de Castro Lopo <erikd@mega-nerd.com>
 * Copyright (c) 2023 libsndfile team
 * Copyright (c) 2025 Superstruct Ltd, New Zealand
 * Licensed under LGPL-2.1
 */

#include <wasm_simd128.h>
#include <emscripten.h>
#include <stdbool.h>
#include <string.h>
#include <math.h>

// SIMD feature detection
EMSCRIPTEN_KEEPALIVE
bool audio_simd_available() {
#ifdef __wasm_simd128__
    return true;
#else
    return false;
#endif
}

// Convert 16-bit integer samples to 32-bit float with SIMD
EMSCRIPTEN_KEEPALIVE
void convert_s16_to_f32_simd(const int16_t* input, float* output, size_t count) {
    const v128_t scale = wasm_f32x4_splat(1.0f / 32768.0f);

    size_t i = 0;
    // Process 4 samples at a time with SIMD
    for (; i + 3 < count; i += 4) {
        // Load 4 int16 values (8 bytes)
        v128_t input_i16 = wasm_v128_load64_zero(&input[i]);

        // Convert to int32
        v128_t input_i32 = wasm_i32x4_extend_low_i16x8(input_i16);

        // Convert to float32
        v128_t input_f32 = wasm_f32x4_convert_i32x4(input_i32);

        // Scale to [-1.0, 1.0] range
        v128_t result = wasm_f32x4_mul(input_f32, scale);

        // Store result
        wasm_v128_store(&output[i], result);
    }

    // Handle remainder samples
    for (; i < count; i++) {
        output[i] = (float)input[i] / 32768.0f;
    }
}

// Convert 32-bit float samples to 16-bit integer with SIMD and dithering
EMSCRIPTEN_KEEPALIVE
void convert_f32_to_s16_simd(const float* input, int16_t* output, size_t count, bool enable_dithering) {
    const v128_t scale = wasm_f32x4_splat(32767.0f);
    const v128_t min_val = wasm_f32x4_splat(-32768.0f);
    const v128_t max_val = wasm_f32x4_splat(32767.0f);

    size_t i = 0;
    // Process 4 samples at a time with SIMD
    for (; i + 3 < count; i += 4) {
        // Load 4 float32 values
        v128_t input_f32 = wasm_v128_load(&input[i]);

        // Apply dithering if enabled (simple triangular dither)
        if (enable_dithering) {
            // This is simplified - real dithering would use proper PRNG
            v128_t dither = wasm_f32x4_splat((rand() / (float)RAND_MAX - 0.5f) / 32768.0f);
            input_f32 = wasm_f32x4_add(input_f32, dither);
        }

        // Scale to int16 range
        v128_t scaled = wasm_f32x4_mul(input_f32, scale);

        // Clamp to valid range
        scaled = wasm_f32x4_max(scaled, min_val);
        scaled = wasm_f32x4_min(scaled, max_val);

        // Convert to int32
        v128_t result_i32 = wasm_i32x4_trunc_sat_f32x4(scaled);

        // Pack to int16 and store (only lower 4 int16 values)
        v128_t result_i16 = wasm_i16x8_narrow_i32x4(result_i32, result_i32);
        wasm_v128_store64_lane(&output[i], result_i16, 0);
    }

    // Handle remainder samples
    for (; i < count; i++) {
        float sample = input[i];
        if (enable_dithering) {
            sample += (rand() / (float)RAND_MAX - 0.5f) / 32768.0f;
        }
        int32_t scaled = (int32_t)(sample * 32767.0f);
        if (scaled < -32768) scaled = -32768;
        if (scaled > 32767) scaled = 32767;
        output[i] = (int16_t)scaled;
    }
}

// Mix multiple audio channels with SIMD acceleration
EMSCRIPTEN_KEEPALIVE
void mix_channels_simd(const float* const* channels, int num_channels,
                       const float* weights, float* output, size_t frames) {
    size_t i = 0;

    // Initialize output to zero
    for (size_t j = 0; j < frames; j++) {
        output[j] = 0.0f;
    }

    // Process each channel
    for (int ch = 0; ch < num_channels; ch++) {
        const float* channel_data = channels[ch];
        const v128_t weight = wasm_f32x4_splat(weights[ch]);

        // Process 4 samples at a time
        for (i = 0; i + 3 < frames; i += 4) {
            // Load channel samples
            v128_t channel_samples = wasm_v128_load(&channel_data[i]);

            // Load current output
            v128_t current_output = wasm_v128_load(&output[i]);

            // Apply weight and accumulate
            v128_t weighted = wasm_f32x4_mul(channel_samples, weight);
            v128_t result = wasm_f32x4_add(current_output, weighted);

            // Store result
            wasm_v128_store(&output[i], result);
        }

        // Handle remainder
        for (; i < frames; i++) {
            output[i] += channel_data[i] * weights[ch];
        }
    }
}

// Calculate RMS and peak values with SIMD
EMSCRIPTEN_KEEPALIVE
void analyze_audio_simd(const float* samples, size_t count,
                        float* rms, float* peak, float* dc_offset) {
    v128_t sum_squares = wasm_f32x4_splat(0.0f);
    v128_t dc_sum = wasm_f32x4_splat(0.0f);
    v128_t peak_vals = wasm_f32x4_splat(0.0f);

    size_t i = 0;
    // Process 4 samples at a time
    for (; i + 3 < count; i += 4) {
        v128_t samples_vec = wasm_v128_load(&samples[i]);

        // DC component
        dc_sum = wasm_f32x4_add(dc_sum, samples_vec);

        // RMS calculation (sum of squares)
        v128_t squares = wasm_f32x4_mul(samples_vec, samples_vec);
        sum_squares = wasm_f32x4_add(sum_squares, squares);

        // Peak detection (absolute values)
        v128_t abs_samples = wasm_f32x4_abs(samples_vec);
        peak_vals = wasm_f32x4_max(peak_vals, abs_samples);
    }

    // Extract horizontal sums and maximums
    float sum_squares_array[4];
    float dc_sum_array[4];
    float peak_array[4];

    wasm_v128_store(sum_squares_array, sum_squares);
    wasm_v128_store(dc_sum_array, dc_sum);
    wasm_v128_store(peak_array, peak_vals);

    float total_sum_squares = sum_squares_array[0] + sum_squares_array[1] +
                              sum_squares_array[2] + sum_squares_array[3];
    float total_dc_sum = dc_sum_array[0] + dc_sum_array[1] +
                         dc_sum_array[2] + dc_sum_array[3];
    float max_peak = fmaxf(fmaxf(peak_array[0], peak_array[1]),
                           fmaxf(peak_array[2], peak_array[3]));

    // Handle remainder samples
    for (; i < count; i++) {
        float sample = samples[i];
        float abs_sample = fabsf(sample);
        total_sum_squares += sample * sample;
        total_dc_sum += sample;
        if (abs_sample > max_peak) max_peak = abs_sample;
    }

    // Calculate final results
    *rms = sqrtf(total_sum_squares / count);
    *peak = max_peak;
    *dc_offset = total_dc_sum / count;
}

// Interleave audio channels with SIMD optimization
EMSCRIPTEN_KEEPALIVE
void interleave_channels_simd(const float* const* channels, int num_channels,
                              float* output, size_t frames_per_channel) {
    if (num_channels == 2) {
        // Optimized stereo interleaving
        const float* left = channels[0];
        const float* right = channels[1];

        size_t i = 0;
        // Process 2 frames (4 samples) at a time
        for (; i + 1 < frames_per_channel; i += 2) {
            // Load L1, L2 from left channel
            v128_t left_samples = wasm_v128_load64_zero(&left[i]);
            // Load R1, R2 from right channel
            v128_t right_samples = wasm_v128_load64_zero(&right[i]);

            // Interleave: [L1, R1, L2, R2]
            v128_t interleaved = wasm_f32x4_make(
                wasm_f32x4_extract_lane(left_samples, 0),   // L1
                wasm_f32x4_extract_lane(right_samples, 0),  // R1
                wasm_f32x4_extract_lane(left_samples, 1),   // L2
                wasm_f32x4_extract_lane(right_samples, 1)   // R2
            );

            wasm_v128_store(&output[i * 2], interleaved);
        }

        // Handle remainder
        for (; i < frames_per_channel; i++) {
            output[i * 2] = left[i];
            output[i * 2 + 1] = right[i];
        }
    } else {
        // General case for any number of channels
        for (size_t frame = 0; frame < frames_per_channel; frame++) {
            for (int ch = 0; ch < num_channels; ch++) {
                output[frame * num_channels + ch] = channels[ch][frame];
            }
        }
    }
}

// Deinterleave audio channels with SIMD optimization
EMSCRIPTEN_KEEPALIVE
void deinterleave_channels_simd(const float* input, float* const* channels,
                                int num_channels, size_t frames) {
    if (num_channels == 2) {
        // Optimized stereo deinterleaving
        float* left = channels[0];
        float* right = channels[1];

        size_t i = 0;
        // Process 2 frames (4 samples) at a time
        for (; i + 1 < frames; i += 2) {
            // Load interleaved data: [L1, R1, L2, R2]
            v128_t interleaved = wasm_v128_load(&input[i * 2]);

            // Extract and store left channel samples
            v128_t left_samples = wasm_f32x4_make(
                wasm_f32x4_extract_lane(interleaved, 0),  // L1
                wasm_f32x4_extract_lane(interleaved, 2),  // L2
                0.0f, 0.0f
            );
            wasm_v128_store64_lane(&left[i], left_samples, 0);

            // Extract and store right channel samples
            v128_t right_samples = wasm_f32x4_make(
                wasm_f32x4_extract_lane(interleaved, 1),  // R1
                wasm_f32x4_extract_lane(interleaved, 3),  // R2
                0.0f, 0.0f
            );
            wasm_v128_store64_lane(&right[i], right_samples, 0);
        }

        // Handle remainder
        for (; i < frames; i++) {
            left[i] = input[i * 2];
            right[i] = input[i * 2 + 1];
        }
    } else {
        // General case for any number of channels
        for (size_t frame = 0; frame < frames; frame++) {
            for (int ch = 0; ch < num_channels; ch++) {
                channels[ch][frame] = input[frame * num_channels + ch];
            }
        }
    }
}

// Apply gain to audio samples with SIMD
EMSCRIPTEN_KEEPALIVE
void apply_gain_simd(float* samples, size_t count, float gain) {
    const v128_t gain_vec = wasm_f32x4_splat(gain);

    size_t i = 0;
    // Process 4 samples at a time
    for (; i + 3 < count; i += 4) {
        v128_t samples_vec = wasm_v128_load(&samples[i]);
        v128_t result = wasm_f32x4_mul(samples_vec, gain_vec);
        wasm_v128_store(&samples[i], result);
    }

    // Handle remainder
    for (; i < count; i++) {
        samples[i] *= gain;
    }
}

// Normalize audio samples to peak value with SIMD
EMSCRIPTEN_KEEPALIVE
void normalize_to_peak_simd(float* samples, size_t count, float target_peak) {
    // First pass: find peak
    float peak;
    float rms, dc_offset;
    analyze_audio_simd(samples, count, &rms, &peak, &dc_offset);

    if (peak > 0.0f) {
        // Second pass: apply normalization gain
        float gain = target_peak / peak;
        apply_gain_simd(samples, count, gain);
    }
}

// Simple low-pass filter with SIMD (first-order)
EMSCRIPTEN_KEEPALIVE
void lowpass_filter_simd(float* samples, size_t count, float cutoff_normalized, float* state) {
    const float alpha = cutoff_normalized;
    const float one_minus_alpha = 1.0f - alpha;
    const v128_t alpha_vec = wasm_f32x4_splat(alpha);
    const v128_t one_minus_alpha_vec = wasm_f32x4_splat(one_minus_alpha);

    float current_state = *state;

    size_t i = 0;
    // Note: This is a simplified SIMD implementation
    // Real IIR filters need careful handling of state between SIMD lanes
    for (; i + 3 < count; i += 4) {
        v128_t input = wasm_v128_load(&samples[i]);

        // Simple approximation - would need proper IIR state handling
        for (int lane = 0; lane < 4; lane++) {
            float sample = wasm_f32x4_extract_lane(input, lane);
            current_state = alpha * sample + one_minus_alpha * current_state;
            input = wasm_f32x4_replace_lane(input, lane, current_state);
        }

        wasm_v128_store(&samples[i], input);
    }

    // Handle remainder
    for (; i < count; i++) {
        current_state = alpha * samples[i] + one_minus_alpha * current_state;
        samples[i] = current_state;
    }

    *state = current_state;
}
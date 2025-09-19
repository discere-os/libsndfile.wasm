#!/bin/bash
# build-dual.sh - Dual build system for libsndfile.wasm
#
# Copyright (c) 1999-2023 Erik de Castro Lopo <erikd@mega-nerd.com>
# Copyright (c) 2023 libsndfile team
# Copyright (c) 2025 Superstruct Ltd, New Zealand
# Licensed under LGPL-2.1

set -euo pipefail

VARIANT="${1:-all}"
BUILD_DIR_PREFIX="${BUILD_DIR_PREFIX:-./build-dual}"
INSTALL_PREFIX="${INSTALL_PREFIX:-./install}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check dependencies and build them if needed
check_prerequisites() {
    log_info "Checking build prerequisites..."

    if ! command -v emcc &> /dev/null; then
        log_error "Emscripten not found. Please install and activate EMSDK."
        exit 1
    fi

    if ! command -v cmake &> /dev/null; then
        log_error "CMake not found. Please install CMake."
        exit 1
    fi

    # Check for codec dependencies
    check_codec_dependencies

    log_success "Prerequisites check completed"
}

check_codec_dependencies() {
    log_info "Checking codec dependencies..."

    # Check for zlib.wasm
    if [ ! -f "../zlib.wasm/install/wasm/zlib-side.wasm" ]; then
        log_warning "zlib-side.wasm not found - it should be available"
    fi

    # Check for ogg.wasm
    if [ ! -f "../ogg.wasm/install/wasm/ogg-side.wasm" ]; then
        log_warning "ogg-side.wasm not found - it should be available"
    fi

    # Check for vorbis.wasm
    if [ ! -f "../vorbis.wasm/install/wasm/vorbis-side.wasm" ]; then
        log_warning "vorbis-side.wasm not found - it should be available"
    fi

    log_info "Found SIDE_MODULE dependencies:"
    ls -lh ../*/install/wasm/*-side.wasm 2>/dev/null | grep -E "(zlib|ogg|vorbis)" || log_warning "No codec SIDE_MODULEs found"
}

# Build SIDE_MODULE (production)
build_side_module() {
    log_info "Building libsndfile-side.wasm for production with dynamic codec loading..."

    BUILD_DIR="${BUILD_DIR_PREFIX}-side"
    mkdir -p "${BUILD_DIR}"
    cd "${BUILD_DIR}"

    # Configure with CMake for SIDE_MODULE - enable external libs for codec support
    emcmake cmake .. \
        -DCMAKE_BUILD_TYPE=Release \
        -DBUILD_SIDE_MODULE=ON \
        -DBUILD_SHARED_LIBS=OFF \
        -DBUILD_PROGRAMS=OFF \
        -DBUILD_EXAMPLES=OFF \
        -DBUILD_TESTING=OFF \
        -DENABLE_EXTERNAL_LIBS=ON \
        -DENABLE_MPEG=OFF \
        -DENABLE_EXPERIMENTAL=OFF \
        -DINSTALL_PKGCONFIG_MODULE=OFF \
        -DZLIB_ROOT=../zlib.wasm/install \
        -DOGG_ROOT=../ogg.wasm/install \
        -DVORBIS_ROOT=../vorbis.wasm/install

    # Build the SIDE_MODULE
    emmake make -j$(nproc) sndfile

    # Manual linking for SIDE_MODULE with dynamic dependency loading
    log_info "Linking libsndfile-side.wasm with dlopen() for codec dependencies..."

    SIDE_SOURCES=$(find src -name "*.o" | grep -v test)

    emcc ${SIDE_SOURCES} \
        -O3 -flto -msimd128 \
        -sSIDE_MODULE=2 \
        -sSTANDALONE_WASM=1 \
        -sMAIN_MODULE=0 \
        -sEXPORTED_FUNCTIONS='["_sf_open","_sf_close","_sf_readf_short","_sf_readf_int","_sf_readf_float","_sf_readf_double","_sf_writef_short","_sf_writef_int","_sf_writef_float","_sf_writef_double","_sf_read_raw","_sf_write_raw","_sf_seek","_sf_command","_sf_format_check","_sf_error","_sf_strerror","_sf_error_number","_sf_version_string"]' \
        -o libsndfile-side.wasm

    # Install artifacts
    mkdir -p "${INSTALL_PREFIX}/wasm"
    cp libsndfile-side.wasm "${INSTALL_PREFIX}/wasm/"

    # Copy codec SIDE_MODULEs to same directory for dynamic loading
    log_info "Copying codec dependencies for dynamic loading..."
    cp ../zlib.wasm/install/wasm/zlib-side.wasm "${INSTALL_PREFIX}/wasm/" 2>/dev/null || log_warning "zlib-side.wasm not found"
    cp ../ogg.wasm/install/wasm/ogg-side.wasm "${INSTALL_PREFIX}/wasm/" 2>/dev/null || log_warning "ogg-side.wasm not found"
    cp ../vorbis.wasm/install/wasm/vorbis-side.wasm "${INSTALL_PREFIX}/wasm/" 2>/dev/null || log_warning "vorbis-side.wasm not found"

    log_success "SIDE_MODULE: ${INSTALL_PREFIX}/wasm/libsndfile-side.wasm"
    log_info "Size: $(stat -c%s ${INSTALL_PREFIX}/wasm/libsndfile-side.wasm | numfmt --to=iec)"
    cd ..
}

# Build MAIN_MODULE (testing/NPM)
build_main_module() {
    log_info "Building libsndfile-main.js for testing with static codec libraries..."

    BUILD_DIR="${BUILD_DIR_PREFIX}-main"
    mkdir -p "${BUILD_DIR}"
    cd "${BUILD_DIR}"

    # Configure with CMake for MAIN_MODULE - enable external libs with static linking
    emcmake cmake .. \
        -DCMAKE_BUILD_TYPE=Release \
        -DBUILD_MAIN_MODULE=ON \
        -DBUILD_SHARED_LIBS=OFF \
        -DBUILD_PROGRAMS=OFF \
        -DBUILD_EXAMPLES=OFF \
        -DBUILD_TESTING=OFF \
        -DENABLE_EXTERNAL_LIBS=ON \
        -DENABLE_MPEG=OFF \
        -DENABLE_EXPERIMENTAL=OFF \
        -DINSTALL_PKGCONFIG_MODULE=OFF \
        -DZLIB_ROOT=../zlib.wasm/install \
        -DOGG_ROOT=../ogg.wasm/install \
        -DVORBIS_ROOT=../vorbis.wasm/install

    # Build the library
    emmake make -j$(nproc) sndfile

    # Manual linking for MAIN_MODULE with static codec libraries
    log_info "Linking libsndfile-main.js with static codec dependencies..."

    MAIN_SOURCES=$(find src -name "*.o" | grep -v test)

    # Collect static libraries from dependencies
    CODEC_LIBS=""
    [ -f "../zlib.wasm/install/lib/libz.a" ] && CODEC_LIBS="$CODEC_LIBS ../zlib.wasm/install/lib/libz.a"
    [ -f "../ogg.wasm/install/lib/libogg.a" ] && CODEC_LIBS="$CODEC_LIBS ../ogg.wasm/install/lib/libogg.a"
    [ -f "../vorbis.wasm/install/lib/libvorbis.a" ] && CODEC_LIBS="$CODEC_LIBS ../vorbis.wasm/install/lib/libvorbis.a"
    [ -f "../vorbis.wasm/install/lib/libvorbisenc.a" ] && CODEC_LIBS="$CODEC_LIBS ../vorbis.wasm/install/lib/libvorbisenc.a"

    log_info "Using codec libraries: $CODEC_LIBS"

    emcc ${MAIN_SOURCES} ${CODEC_LIBS} \
        -O3 -flto -msimd128 \
        -sMODULARIZE=1 \
        -sEXPORT_ES6=1 \
        -sEXPORT_NAME="LibsndfileModule" \
        -sEXPORTED_FUNCTIONS='["_sf_open","_sf_close","_sf_readf_short","_sf_readf_int","_sf_readf_float","_sf_readf_double","_sf_writef_short","_sf_writef_int","_sf_writef_float","_sf_writef_double","_sf_read_raw","_sf_write_raw","_sf_seek","_sf_command","_sf_format_check","_sf_error","_sf_strerror","_sf_error_number","_sf_version_string","_malloc","_free"]' \
        -sEXPORTED_RUNTIME_METHODS='["cwrap","ccall","UTF8ToString","stringToUTF8","HEAPU8","HEAP16","HEAP32","HEAPF32","HEAPF64"]' \
        -sALLOW_MEMORY_GROWTH=1 \
        -sINITIAL_MEMORY=33554432 \
        -sMAXIMUM_MEMORY=134217728 \
        -sENVIRONMENT=web,webview,worker \
        -sNODEJS_CATCH_EXIT=0 \
        -sNODEJS_CATCH_REJECTION=0 \
        -o libsndfile-main.js

    # Install artifacts
    mkdir -p "${INSTALL_PREFIX}/wasm"
    cp libsndfile-main.js "${INSTALL_PREFIX}/wasm/"
    cp libsndfile-main.wasm "${INSTALL_PREFIX}/wasm/"

    log_success "MAIN_MODULE: ${INSTALL_PREFIX}/wasm/libsndfile-main.js"
    log_info "JS Size: $(stat -c%s ${INSTALL_PREFIX}/wasm/libsndfile-main.js | numfmt --to=iec)"
    log_info "WASM Size: $(stat -c%s ${INSTALL_PREFIX}/wasm/libsndfile-main.wasm | numfmt --to=iec)"
    cd ..
}

# Clean build artifacts
clean_build() {
    log_info "Cleaning build artifacts..."
    rm -rf "${BUILD_DIR_PREFIX}"-* "${INSTALL_PREFIX}"
    log_success "Clean completed"
}

# Add CMake configuration for dual build
setup_cmake_config() {
    if ! grep -q "BUILD_SIDE_MODULE" CMakeLists.txt; then
        log_info "Adding WASM-specific CMake configuration..."

        cat >> CMakeLists.txt << 'EOF'

# WASM-specific build options
option(BUILD_SIDE_MODULE "Build as SIDE_MODULE" OFF)
option(BUILD_MAIN_MODULE "Build as MAIN_MODULE" OFF)

# Configure for SIDE_MODULE
if(BUILD_SIDE_MODULE)
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -fPIC -msimd128")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fPIC -msimd128")
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -sSIDE_MODULE=2")
    add_definitions(-DLIBSNDFILE_SIDE_MODULE=1)
    # Disable exception catching for smaller size
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -sDISABLE_EXCEPTION_CATCHING=1")
    set(BUILD_SHARED_LIBS OFF)
    set(BUILD_PROGRAMS OFF)
    set(BUILD_EXAMPLES OFF)
    set(BUILD_TESTING OFF)
endif()

# Configure for MAIN_MODULE
if(BUILD_MAIN_MODULE)
    set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -msimd128")
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -msimd128")
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -sMODULARIZE=1")
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -sEXPORT_ES6=1")
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -sEXPORT_NAME=LibsndfileModule")
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -sALLOW_MEMORY_GROWTH=1")
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -sINITIAL_MEMORY=33554432")
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -sENVIRONMENT=web,webview,worker")
    set(BUILD_SHARED_LIBS OFF)
    set(BUILD_PROGRAMS OFF)
    set(BUILD_EXAMPLES OFF)
    set(BUILD_TESTING OFF)
endif()
EOF
        log_success "CMake configuration added"
    fi
}

case "$VARIANT" in
    side)
        setup_cmake_config
        check_prerequisites
        build_side_module
        ;;
    main)
        setup_cmake_config
        check_prerequisites
        build_main_module
        ;;
    all)
        setup_cmake_config
        check_prerequisites
        build_side_module
        build_main_module
        ;;
    clean)
        clean_build
        ;;
    *)
        echo "Usage: $0 [side|main|all|clean]"
        exit 1
        ;;
esac

log_success "Build process completed successfully"
project('libsndfile.wasm', 'c', version: '1.2.x', meson_version: '>=1.3.0', default_options: ['buildtype=release'])
fs = import('fs')
add_project_arguments(['-DHAVE_CONFIG_H','-I' + meson.project_source_root() / 'src'], language: 'c')

if get_option('simd')
  add_project_arguments('-msimd128', language: 'c')
fs = import('fs')
endif

incs = [ include_directories('src'), include_directories('include') ]

core_sources = [
  'src/sndfile.c','src/common.c','src/pcm.c','src/wav.c','src/wavlike.c','src/aiff.c','src/raw.c',
  'src/au.c','src/strings.c','src/file_io.c','src/broadcast.c','src/cart.c','src/chanmap.c',
  'src/dither.c','src/float32.c','src/double64.c'
]

core = static_library('sndfile_core', core_sources, include_directories: incs)

if get_option('main_module')
  executable('libsndfile-main','src/libsndfile_wasm_module.c',
    link_with: core, include_directories: incs, install: true,
    link_args: [
      '--no-entry','-sMODULARIZE=1','-sEXPORT_ES6=1','-sALLOW_MEMORY_GROWTH=1','-sENVIRONMENT=web,webview,worker',
      '-sNO_FILESYSTEM=1','-sEXPORTED_RUNTIME_METHODS=["cwrap","ccall","UTF8ToString"]',
      '-sEXPORTED_FUNCTIONS=@' + meson.project_source_root() / get_option('exports')
    ])
endif

if get_option('side_module')
  shared_module('libsndfile-side','src/libsndfile_wasm_side.c',
    link_whole: core, include_directories: incs, name_prefix: '', install: true,
    link_args: ['-sSIDE_MODULE=2','-fPIC'])
endif

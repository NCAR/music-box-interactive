#----------------------------------------------------------------
# Generated CMake target import file for configuration "Release".
#----------------------------------------------------------------

# Commands may need to know the format version.
set(CMAKE_IMPORT_FILE_VERSION 1)

# Import target "musica::musica" for configuration "Release"
set_property(TARGET musica::musica APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(musica::musica PROPERTIES
  IMPORTED_LINK_INTERFACE_LANGUAGES_RELEASE "CXX"
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/lib/musica.lib"
  )

list(APPEND _cmake_import_check_targets musica::musica )
list(APPEND _cmake_import_check_files_for_musica::musica "${_IMPORT_PREFIX}/lib/musica.lib" )

# Import target "musica::yaml-cpp" for configuration "Release"
set_property(TARGET musica::yaml-cpp APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(musica::yaml-cpp PROPERTIES
  IMPORTED_LINK_INTERFACE_LANGUAGES_RELEASE "CXX"
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/lib/yaml-cpp.lib"
  )

list(APPEND _cmake_import_check_targets musica::yaml-cpp )
list(APPEND _cmake_import_check_files_for_musica::yaml-cpp "${_IMPORT_PREFIX}/lib/yaml-cpp.lib" )

# Import target "musica::mechanism_configuration" for configuration "Release"
set_property(TARGET musica::mechanism_configuration APPEND PROPERTY IMPORTED_CONFIGURATIONS RELEASE)
set_target_properties(musica::mechanism_configuration PROPERTIES
  IMPORTED_LINK_INTERFACE_LANGUAGES_RELEASE "CXX"
  IMPORTED_LOCATION_RELEASE "${_IMPORT_PREFIX}/lib/mechanism_configuration.lib"
  )

list(APPEND _cmake_import_check_targets musica::mechanism_configuration )
list(APPEND _cmake_import_check_files_for_musica::mechanism_configuration "${_IMPORT_PREFIX}/lib/mechanism_configuration.lib" )

# Commands beyond this point should not need to know the version.
set(CMAKE_IMPORT_FILE_VERSION)

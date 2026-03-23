# Distributed under the OSI-approved BSD 3-Clause License.  See accompanying
# file Copyright.txt or https://cmake.org/licensing for details.

cmake_minimum_required(VERSION 3.5)

# If CMAKE_DISABLE_SOURCE_CHANGES is set to true and the source directory is an
# existing directory in our source tree, calling file(MAKE_DIRECTORY) on it
# would cause a fatal error, even though it would be a no-op.
if(NOT EXISTS "C:/Documents/Capstone/Project/musica/build/_deps/micm-src")
  file(MAKE_DIRECTORY "C:/Documents/Capstone/Project/musica/build/_deps/micm-src")
endif()
file(MAKE_DIRECTORY
  "C:/Documents/Capstone/Project/musica/build/_deps/micm-build"
  "C:/Documents/Capstone/Project/musica/build/_deps/micm-subbuild/micm-populate-prefix"
  "C:/Documents/Capstone/Project/musica/build/_deps/micm-subbuild/micm-populate-prefix/tmp"
  "C:/Documents/Capstone/Project/musica/build/_deps/micm-subbuild/micm-populate-prefix/src/micm-populate-stamp"
  "C:/Documents/Capstone/Project/musica/build/_deps/micm-subbuild/micm-populate-prefix/src"
  "C:/Documents/Capstone/Project/musica/build/_deps/micm-subbuild/micm-populate-prefix/src/micm-populate-stamp"
)

set(configSubDirs Debug)
foreach(subDir IN LISTS configSubDirs)
    file(MAKE_DIRECTORY "C:/Documents/Capstone/Project/musica/build/_deps/micm-subbuild/micm-populate-prefix/src/micm-populate-stamp/${subDir}")
endforeach()
if(cfgdir)
  file(MAKE_DIRECTORY "C:/Documents/Capstone/Project/musica/build/_deps/micm-subbuild/micm-populate-prefix/src/micm-populate-stamp${cfgdir}") # cfgdir has leading slash
endif()

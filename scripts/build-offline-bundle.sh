#!/usr/bin/env bash
set -euo pipefail
if [ "$#" -ne 4 ]; then echo 'usage: build-offline-bundle.sh PLATFORM VERIFIED_RUNTIME VERIFIED_MODEL SHA256_MANIFEST' >&2; exit 2; fi
platform=$1; runtime=$2; model=$3; manifest=$4
sha256sum --check "$manifest"
case "$platform" in linux-x64|linux-arm64|windows-x64|macos-arm64|macos-x64) ;; *) echo 'unsupported platform' >&2; exit 2;; esac
echo "Inputs verified. Human license review is required before packaging $platform."
echo 'Run npm pack, stage the verified files plus licenses, then archive without publishing.'

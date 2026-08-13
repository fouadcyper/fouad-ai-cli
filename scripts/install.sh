#!/usr/bin/env bash
set -euo pipefail
echo 'Download the release archive and SHA256SUMS over HTTPS, then run sha256sum --check locally.'
echo 'After verification: npm install --global ./fouad-ai-*.tgz (no root needed with a user npm prefix).'

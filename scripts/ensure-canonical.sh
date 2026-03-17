#!/usr/bin/env bash
set -euo pipefail
CANON="/Users/javierbarro/Projects/devilfruittcg"
HERE="$(pwd -P)"
if [[ "$HERE" != "$CANON" ]]; then
  echo "❌ Wrong project path: $HERE"
  echo "✅ Use canonical path: $CANON"
  exit 1
fi
echo "✅ Canonical project confirmed: $HERE"

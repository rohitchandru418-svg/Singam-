#!/usr/bin/env bash
#
# Build a distributable zip of the application from the files tracked in git.
#
# `git archive` is used on purpose: it ships exactly the source that is committed
# and excludes everything ignored (node_modules, .next, the local SQLite database
# and the dev-server logs), so the zip stays small and reproducible.
#
# Usage: bash scripts/package.sh   (or: npm run package)
set -euo pipefail

cd "$(dirname "$0")/.."

NAME="startup-singam-erp"
OUT="${NAME}.zip"

rm -f "$OUT"
git archive --format=zip --prefix="${NAME}/" -o "$OUT" HEAD

echo "Wrote ${OUT} ($(du -h "$OUT" | cut -f1))"
echo
echo "The archive contains a ${NAME}/ folder. To run it:"
echo "  unzip ${OUT} && cd ${NAME}"
echo "  npm install"
echo "  npm run dev          # http://localhost:12000"

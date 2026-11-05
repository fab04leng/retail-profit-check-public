#!/usr/bin/env bash
# Converts the PNG captures to WebP (max 1200 px wide) for the landing page.
# Usage: marketing/scripts/convert-assets.sh <raw-png-dir>
set -euo pipefail
RAW="${1:-marketing/landing/assets/raw}"
OUT="marketing/landing/assets"
for f in "$RAW"/*.png; do
  name="$(basename "$f" .png)"
  ffmpeg -loglevel error -y -i "$f" -vf "scale='min(1200,iw)':-2:flags=lanczos" -quality 82 "$OUT/$name.webp"
done
ls -la "$OUT"/*.webp

#!/usr/bin/env bash
# Rebuild every placeholder SFX in public/audio/sfx/ from scripts/audio/generate.py.
# Real assets replace the .ogg files in place; this script only ever regenerates
# placeholders, so run it when the CUE table changes, not after a real asset lands.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WAV="${TMPDIR:-/tmp}/optcg-sfx-wav"
OUT="$ROOT/public/audio/sfx"

rm -rf "$WAV"
python3 "$ROOT/scripts/audio/generate.py" "$WAV"

cd "$WAV"
find . -name '*.wav' -print0 | xargs -0 -P 8 -I{} bash -c '
  rel="${1#./}"; out="'"$OUT"'/${rel%.wav}.ogg"
  mkdir -p "$(dirname "$out")"
  ffmpeg -y -loglevel error -i "$1" -c:a libvorbis -q:a 3 -ar 44100 "$out"
' _ {}

echo "encoded $(find "$OUT" -name '*.ogg' | wc -l) placeholder cues -> public/audio/sfx"
du -sh "$OUT"

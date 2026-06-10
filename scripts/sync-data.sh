#!/bin/sh
set -euo pipefail

SOURCE_DIR="${1:-../openbikedata-processor/data}"
DEST_DIR="$(cd "$(dirname "$0")/.." && pwd)/mbtiles"

mkdir -p "$DEST_DIR"

if [ ! -f "$SOURCE_DIR/openbikemap.mbtiles" ]; then
  echo "Missing $SOURCE_DIR/openbikemap.mbtiles"
  echo "Run the processor with GENERATE_TILES=1 first."
  exit 1
fi

cp "$SOURCE_DIR/openbikemap.mbtiles" "$DEST_DIR/openbikemap.mbtiles"
echo "Copied openbikemap.mbtiles to $DEST_DIR"

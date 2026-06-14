#!/bin/sh
set -euo pipefail

REGION="${REGION:-stockholm}"
SKIP_DOWNLOAD=false
NO_TILESERVER=false

while [[ "$#" -gt 0 ]]; do
  case $1 in
    --region) REGION="$2"; shift ;;
    --sweden) REGION="sweden" ;;
    --skip-download) SKIP_DOWNLOAD=true ;;
    --no-tileserver) NO_TILESERVER=true ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
  shift
done

case "$REGION" in
  stockholm) BBOX="${BBOX:-[17.9,59.32,18.05,59.36]}" ;;
  sweden)
    BBOX="${BBOX:-[10.96,55.34,24.18,69.06]}"
    export MAX_OLD_SPACE_SIZE="${MAX_OLD_SPACE_SIZE:-8192}"
    export OVERPASS_TIMEOUT="${OVERPASS_TIMEOUT:-7200}"
    export OVERPASS_GRID_PAUSE_MS="${OVERPASS_GRID_PAUSE_MS:-90000}"
    export TRAILS_BBOX_GRID="${TRAILS_BBOX_GRID:-/app/scripts/sweden-trails-grid.json}"
    ;;
  *) echo "Unknown region: $REGION"; exit 1 ;;
esac

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TILES_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROCESSOR_DIR="$(cd "$TILES_DIR/../openbikedata-processor" && pwd)"

echo "==> Generating tiles in Docker (bbox: $BBOX)"
export BBOX
export GENERATE_TILES=1

if [ "$SKIP_DOWNLOAD" = true ]; then
  docker compose -f "$PROCESSOR_DIR/docker-compose.yml" run --rm processor bash run.sh --skip-download
else
  docker compose -f "$PROCESSOR_DIR/docker-compose.yml" run --rm processor
fi

echo "==> Copying openbikemap.mbtiles"
"$SCRIPT_DIR/sync-data.sh"

if [ "$NO_TILESERVER" = false ]; then
  echo "==> Starting tileserver on http://localhost:8083"
  cd "$TILES_DIR"
  docker compose up -d
  echo ""
  echo "Tileserver ready:"
  echo "  Style:  http://localhost:8083/styles/terrain/style.json"
  echo "  Health: http://localhost:8083/health"
fi

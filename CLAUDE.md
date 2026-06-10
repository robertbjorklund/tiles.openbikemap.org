# tiles.openbikemap.org Development Guide

## Commands
- `npm run build-style` - Regenerate `styles/terrain.json` from OpenFreeMap liberty
- `docker compose up` - Start tileserver-gl on port 8083
- `./scripts/sync-data.sh` - Copy mbtiles from openbikedata-processor

## Architecture
- **tileserver-gl** serves `openbikemap.mbtiles` and MapLibre styles
- **terrain.json** = OpenFreeMap basemap + bike trail/route overlay layers
- Data pipeline: `openbikedata-processor` → tippecanoe → `openbikemap.mbtiles`

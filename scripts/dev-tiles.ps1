param(
  [string]$Bbox,
  [ValidateSet("stockholm", "stockholm_100km", "sweden", "resorts")]
  [string]$Region = "stockholm",
  [switch]$SkipDownload,
  [switch]$NoTileserver
)

$ErrorActionPreference = "Stop"

$TilesDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$ProcessorDir = Resolve-Path (Join-Path $TilesDir "..\openbikedata-processor")
$Regions = Get-Content (Join-Path $PSScriptRoot "regions.json") -Raw | ConvertFrom-Json

if (-not $Bbox) {
  $Bbox = $Regions.$Region
}

Write-Host "==> Region: $Region"
Write-Host "==> Generating tiles in Docker (bbox: $Bbox)"
Write-Host "    Large regions can take 1-3+ hours (Overpass download + tippecanoe)."

$env:BBOX = $Bbox
$env:GENERATE_TILES = "1"
$env:OVERPASS_TIMEOUT = "1800"
Remove-Item Env:BBOX_GRID -ErrorAction SilentlyContinue
Remove-Item Env:TRAILS_BBOX_GRID -ErrorAction SilentlyContinue
Remove-Item Env:OVERPASS_GRID_PAUSE_MS -ErrorAction SilentlyContinue

if ($Region -eq "stockholm_100km") {
  $env:MAX_OLD_SPACE_SIZE = "8192"
  $env:OVERPASS_TIMEOUT = "5400"
  Write-Host "    ~100 km radius from Stockholm city (bbox ~200x200 km)."
  Write-Host "    Using 8 GB memory and 90 min Overpass timeout."
}

if ($Region -eq "sweden") {
  $env:MAX_OLD_SPACE_SIZE = "8192"
  $env:OVERPASS_TIMEOUT = "7200"
  $env:OVERPASS_GRID_PAUSE_MS = "90000"
  $env:BBOX_GRID = "/app/scripts/sweden-trails-grid.json"
  Write-Host "    Using extended memory (8 GB), Overpass timeout (2 h), and 6-cell grid."
}

if ($Region -eq "resorts") {
  $env:OVERPASS_TIMEOUT = "600"
  $env:OVERPASS_GRID_PAUSE_MS = "30000"
  $env:BBOX_GRID = "/app/scripts/resort-towns-grid.json"
  Write-Host "    Resort validation: Are, Salen, Rorbacksnas, Lofsdalen, Jarvso (5 cells, 30s pause)."
}

$dockerArgs = @(
  "compose",
  "-f", (Join-Path $ProcessorDir "docker-compose.yml"),
  "run", "--rm", "--build", "processor"
)

if ($SkipDownload) {
  $dockerArgs += "bash", "run.sh", "--skip-download"
}

docker @dockerArgs
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host "==> Copying openbikemap.mbtiles"
& (Join-Path $PSScriptRoot "sync-data.ps1") -SourceDir (Join-Path $ProcessorDir "data")

if (-not $NoTileserver) {
  Write-Host "==> Starting tileserver on http://localhost:8083"
  Push-Location $TilesDir
  try {
    docker compose up -d
    Write-Host ""
    Write-Host "Tileserver ready:"
    Write-Host "  Style:  http://localhost:8083/styles/terrain/style.json"
    Write-Host "  Health: http://localhost:8083/health"
    Write-Host ""
    Write-Host "Frontend: set VITE_TILES_BASE_URL=http://localhost:8083 in openbikemap.org/.env.local"
  } finally {
    Pop-Location
  }
}

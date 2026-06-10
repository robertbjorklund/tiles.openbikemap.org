param(
  [string]$SourceDir
)

$ErrorActionPreference = "Stop"

$TilesRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
if (-not $SourceDir) {
  $SourceDir = Join-Path $TilesRoot "..\openbikedata-processor\data"
}
$SourceDir = Resolve-Path $SourceDir

$DestDir = Join-Path $TilesRoot "mbtiles"
if (-not (Test-Path $DestDir)) {
  New-Item -ItemType Directory -Path $DestDir -Force | Out-Null
}
$DestDir = Resolve-Path $DestDir

$SourceFile = Join-Path $SourceDir "openbikemap.mbtiles"
if (-not (Test-Path $SourceFile)) {
  Write-Error "Missing $SourceFile. Run openbikedata-processor with GENERATE_TILES=1 first."
  exit 1
}

Copy-Item $SourceFile (Join-Path $DestDir "openbikemap.mbtiles") -Force
Write-Host "Copied openbikemap.mbtiles to $DestDir"

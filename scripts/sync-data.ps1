param(
  [string]$SourceDir = "..\openbikedata-processor\data"
)

$DestDir = Join-Path $PSScriptRoot "..\mbtiles" | Resolve-Path -ErrorAction SilentlyContinue
if (-not $DestDir) {
  $DestDir = New-Item -ItemType Directory -Path (Join-Path $PSScriptRoot "..\mbtiles") -Force
}

$SourceFile = Join-Path $SourceDir "openbikemap.mbtiles"
if (-not (Test-Path $SourceFile)) {
  Write-Error "Missing $SourceFile. Run openbikedata-processor with GENERATE_TILES=1 first."
  exit 1
}

Copy-Item $SourceFile (Join-Path $DestDir "openbikemap.mbtiles") -Force
Write-Host "Copied openbikemap.mbtiles to $DestDir"

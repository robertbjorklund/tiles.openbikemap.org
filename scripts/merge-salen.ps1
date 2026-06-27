param(
  [string]$BaseDataDir,
  [switch]$Fetch,
  [switch]$SkipTiles
)

$ErrorActionPreference = "Stop"
$TilesDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$ProcessorDir = Resolve-Path (Join-Path $TilesDir "..\openbikedata-processor")

if (-not $BaseDataDir) {
  $BaseDataDir = Join-Path $ProcessorDir "data"
}

$mergeArgs = @(
  "-BaseDir", $BaseDataDir,
  "-OutputDir", $BaseDataDir
)

if ($Fetch) {
  $mergeArgs += "-Fetch"
}
if ($SkipTiles) {
  $mergeArgs += "-SkipTiles"
}

& (Join-Path $ProcessorDir "scripts\merge-salen.ps1") @mergeArgs
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host "==> Syncing MBTiles to tiles.openbikemap.org"
& (Join-Path $PSScriptRoot "sync-data.ps1") -SourceDir $BaseDataDir

# Produces both distributable forms from the same source, so they cannot drift:
#   dist/                        -> loose files, for chrome://extensions "Load unpacked"
#   build/<name>-<version>.zip   -> for Chrome Web Store upload (it rejects loose files)
#
# Usage:  pwsh -File build.ps1

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot

# Everything the extension actually ships. README, build/ and dist/ are excluded.
$payload = @('manifest.json', 'icons', 'popup', 'src')

$manifest = Get-Content (Join-Path $root 'manifest.json') -Raw | ConvertFrom-Json
$version = $manifest.version

$dist = Join-Path $root 'dist'
if (Test-Path $dist) { Remove-Item $dist -Recurse -Force }
New-Item -ItemType Directory -Force $dist | Out-Null

foreach ($item in $payload) {
  Copy-Item (Join-Path $root $item) -Destination $dist -Recurse
}

$buildDir = Join-Path $root 'build'
New-Item -ItemType Directory -Force $buildDir | Out-Null
$zip = Join-Path $buildDir "subtitle-restyler-$version.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }

# Zip the *contents* of dist, not the folder itself — manifest.json must sit at
# the archive root or the store rejects the upload.
Compress-Archive -Path (Join-Path $dist '*') -DestinationPath $zip

$count = (Get-ChildItem $dist -Recurse -File).Count
Write-Host "dist/  -> $count files (Load unpacked points here)"
Write-Host ("build/ -> subtitle-restyler-$version.zip ({0:N1} KB)" -f ((Get-Item $zip).Length / 1KB))

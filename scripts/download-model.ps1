# PowerShell script to download free Live2D model (Haru) for Lumi desktop pet
# Model source: Eikanya/Live2d-model (GitHub)
# Requires: curl (available on Windows 10+)

$ErrorActionPreference = "Stop"
$DEST = "public/models"
New-Item -ItemType Directory -Force -Path $DEST | Out-Null

$BASE = "https://raw.githubusercontent.com/Eikanya/Live2d-model/v1.0.0/Haru"

Write-Host "Downloading Haru Live2D model..." -ForegroundColor Green

# Core model files
$files = @(
    "Haru.model3.json",
    "Haru.moc3",
    "Haru.physics3.json",
    "Haru.pose3.json"
)

# Texture files (Haru typically has texture_00.png through texture_04.png)
$textureFiles = @(
    "texture_00.png",
    "texture_01.png",
    "texture_02.png",
    "texture_03.png",
    "texture_04.png"
)

# Download all files
foreach ($file in $files + $textureFiles) {
    $url = "$BASE/$file"
    $out = "$DEST/$file"
    Write-Host "  Downloading $file..." -ForegroundColor Gray
    try {
        curl -L --connect-timeout 10 "$url" -o "$out"
        if ((Get-Item "$out").Length -lt 50) {
            Write-Host "    (skipped - not available)" -ForegroundColor DarkGray
            Remove-Item "$out" -ErrorAction SilentlyContinue
        }
    } catch {
        Write-Host "    (failed - skipping)" -ForegroundColor DarkGray
    }
}

# Motion files
$motions = @(
    "motions/idle_01.motion3.json",
    "motions/tap_01.motion3.json",
    "motions/angry_01.motion3.json",
    "motions/bye_01.motion3.json"
)

foreach ($motion in $motions) {
    $dir = Split-Path -Parent "$DEST/$motion"
    New-Item -ItemType Directory -Force -Path $dir | Out-Null

    $url = "$BASE/$motion"
    $out = "$DEST/$motion"
    Write-Host "  Downloading $motion..." -ForegroundColor Gray
    try {
        curl -L --connect-timeout 10 "$url" -o "$out"
    } catch {
        Write-Host "    (failed - skipping)" -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "Done! Model saved to $DEST/" -ForegroundColor Green
Write-Host "Set model path to: models/Haru.model3.json in Lumi settings" -ForegroundColor Yellow

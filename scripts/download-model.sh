#!/bin/bash
# Download free Live2D model (Haru) for Lumi desktop pet
# Model from: https://github.com/Eikanya/Live2d-model (CC BY-NC 4.0)

set -e
DEST="public/models"
mkdir -p "$DEST"

BASE="https://raw.githubusercontent.com/Eikanya/Live2d-model/v1.0.0/Haru"

echo "Downloading Haru Live2D model..."

# Model definition
curl -L --progress-bar "$BASE/Haru.model3.json" -o "$DEST/Haru.model3.json"
curl -L --progress-bar "$BASE/Haru.moc3" -o "$DEST/Haru.moc3"

# Textures
for tex in $(curl -sL "$BASE/" | grep -oP 'texture_\d+\.png' | sort -u); do
  curl -L --progress-bar "$BASE/$tex" -o "$DEST/$tex"
done

# Physics and pose (optional)
curl -L --progress-bar "$BASE/Haru.physics3.json" -o "$DEST/Haru.physics3.json" 2>/dev/null || true
curl -L --progress-bar "$BASE/Haru.pose3.json" -o "$DEST/Haru.pose3.json" 2>/dev/null || true

# Motions
for motion_dir in $(curl -sL "$BASE/" | grep -oP 'motions/\w+' | sort -u); do
  mkdir -p "$DEST/$motion_dir"
  for file in $(curl -sL "$BASE/$motion_dir/" | grep -oP '[\w-]+\.motion3\.json' | sort -u); do
    curl -L --progress-bar "$BASE/$motion_dir/$file" -o "$DEST/$motion_dir/$file"
  done
done

echo ""
echo "Done! Model saved to $DEST/"
echo "Set model path to: models/Haru.model3.json in Lumi settings"

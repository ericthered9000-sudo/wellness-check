#!/bin/bash
# Icon Generation Script for Wellness Check
# Run this after creating a 512x512 master icon
#
# Prerequisites:
#   - ImageMagick: sudo apt install imagemagick
#   - Or use online tools like:
#     - https://appicon.co/
#     - https://makeappicon.com/
#     - https://icon.kitchen/
#
# Master icon should be:
#   - 512x512 pixels
#   - PNG format with transparency
#   - Simple, clear design (works at small sizes)
#   - Named icon-master.png

MASTER_ICON="icon-master.png"

if [ ! -f "$MASTER_ICON" ]; then
  echo "Error: $MASTER_ICON not found"
  echo "Please create a 512x512 PNG icon first"
  exit 1
fi

echo "Generating Android mipmap icons..."

# Android mipmap sizes
declare -A sizes=(
  ["mdpi"]=48
  ["hdpi"]=72
  ["xhdpi"]=96
  ["xxhdpi"]=144
  ["xxxhdpi"]=192
)

for density in "${!sizes[@]}"; do
  size=${sizes[$density]}
  mkdir -p "android/app/src/main/res/mipmap-$density"
  convert "$MASTER_ICON" -resize ${size}x${size} "android/app/src/main/res/mipmap-$density/ic_launcher.png"
  convert "$MASTER_ICON" -resize ${size}x${size} "android/app/src/main/res/mipmap-$density/ic_launcher_round.png"
  echo "Generated mipmap-$density (${size}x${size})"
done

echo ""
echo "Generating play store icon..."
mkdir -p "play-store"
convert "$MASTER_ICON" -resize 512x512 "play-store/icon-512.png"
echo "Generated play-store/icon-512.png"

echo ""
echo "Generating feature graphic (1024x500)..."
echo "Note: Feature graphic requires text and design. Create manually or use Canva/Figma."
echo "Template: play-store/feature-graphic-template.png"

echo ""
echo "Done! Icons generated in android/app/src/main/res/mipmap-*/"
echo ""
echo "Next steps:"
echo "1. Create feature graphic (1024x500) for Play Store"
echo "2. Take screenshots on device or emulator"
echo "3. Fill out store listing in Google Play Console"
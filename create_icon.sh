#!/bin/bash

# Script to help create app icon for Mac App Store
# Place a 1024x1024 PNG image named "icon.png" in this directory
# This script will create the required .icns file

if [ ! -f "icon.png" ]; then
    echo "Error: icon.png not found!"
    echo "Please create a 1024x1024 PNG image and name it 'icon.png'"
    exit 1
fi

echo "Creating app icon from icon.png..."

# Create iconset directory
mkdir -p icon.iconset

# Create all required icon sizes
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png

# Create .icns file
iconutil -c icns icon.iconset -o assets/icon.icns

# Clean up
rm -rf icon.iconset

echo "✅ App icon created: assets/icon.icns"
echo "You can now build for Mac App Store!"

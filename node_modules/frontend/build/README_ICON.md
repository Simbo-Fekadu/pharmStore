# App Icon

Place a Windows ICO file named `icon.ico` in this folder before running `npm run desktop:build`.

Recommended steps to generate:

1. Start from a 1024x1024 PNG with transparent background.
2. Use a tool (e.g. https://icoconvert.com or ImageMagick) to produce a multi-size ICO containing 16, 24, 32, 48, 64, 128, 256 sizes.
3. Save as `icon.ico` here.

If no icon is provided electron-builder will fallback to a generic icon.

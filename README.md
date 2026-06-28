# Factorio icon

This repository builds `src/factorio-wheel.png` into a PNG-backed Windows icon
containing 19 resolutions from 16x16 through 256x256.

## Included sizes

Microsoft explains that Windows looks for an exact icon-size match before
scaling down the next larger image. To minimize that scaling, the generated ICO
includes every distinct pixel size in Microsoft's [Windows 11 icon scaling
table](https://learn.microsoft.com/en-us/windows/apps/design/iconography/app-icon-construction):
16, 20, 24, 30, 32, 36, 40, 48, 60, 64, 72, 80, 96, and 256 pixels.

It also includes 100, 125, 128, 150, and 200 pixel images for additional size
coverage.

## Build

Node.js 20.9 or newer is required. Install the locked dependencies and build the
icon with:

```sh
npm ci
npm run build:icon
```

The generated file is `dist/factorio.ico`. The `dist` directory is ignored
because GitHub Actions rebuilds the icon before publishing it.

Sharp performs the Lanczos3 resizing. Each PNG is then aggressively compressed
with the lossless `zopflipng-bin` executable. The script writes the ICO
container directly, keeping the build small and easy to audit.

## Releases

Every successful push to the repository's default branch creates a stable
GitHub Release. Its tag is based on the workflow run ID and its downloadable
asset is named `factorio.ico`.

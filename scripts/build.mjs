import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import sharp from 'sharp';
import zopflipng from 'zopflipng-bin';

const sizes = [
  16, 20, 24, 30, 32, 36, 40, 48, 60, 64,
  72, 80, 96, 100, 125, 128, 150, 200, 256,
];

const root = fileURLToPath(new URL('../', import.meta.url));
const input = resolve(root, 'src/factorio-wheel.png');
const output = resolve(root, 'dist/factorio.ico');

const headerSize = 6;
const entrySize = 16;
const run = promisify(execFile);

async function buildPng(size, temporaryDirectory) {
  const resized = await sharp(input)
    .resize(size, size, { kernel: sharp.kernel.lanczos3 })
    .ensureAlpha()
    .png({
      adaptiveFiltering: true,
      compressionLevel: 9,
      palette: false,
    })
    .toBuffer();

  const inputPath = join(temporaryDirectory, `${size}-input.png`);
  const outputPath = join(temporaryDirectory, `${size}-output.png`);

  await writeFile(inputPath, resized);
  await run(zopflipng, ['-m', '-y', inputPath, outputPath]);

  const optimised = await readFile(outputPath);

  return optimised.length < resized.length ? optimised : resized;
}

function buildIco(images) {
  const directorySize = headerSize + images.length * entrySize;
  const directory = Buffer.alloc(directorySize);

  directory.writeUInt16LE(0, 0); // Reserved.
  directory.writeUInt16LE(1, 2); // Image type: icon.
  directory.writeUInt16LE(images.length, 4);

  let imageOffset = directorySize;

  for (const [index, image] of images.entries()) {
    const size = sizes[index];
    const offset = headerSize + index * entrySize;
    const encodedSize = size === 256 ? 0 : size;

    directory.writeUInt8(encodedSize, offset);
    directory.writeUInt8(encodedSize, offset + 1);
    directory.writeUInt8(0, offset + 2); // Derive colour count from PNG.
    directory.writeUInt8(0, offset + 3); // Reserved.
    directory.writeUInt16LE(1, offset + 4); // Colour planes.
    directory.writeUInt16LE(32, offset + 6); // Bits per pixel.
    directory.writeUInt32LE(image.length, offset + 8);
    directory.writeUInt32LE(imageOffset, offset + 12);

    imageOffset += image.length;
  }

  return Buffer.concat([directory, ...images]);
}

const temporaryDirectory = await mkdtemp(join(tmpdir(), 'factorio-icon-'));

try {
  const images = [];
  for (const size of sizes) {
    const image = await buildPng(size, temporaryDirectory);
    images.push(image);
    console.log(`${size}x${size}: ${image.length.toLocaleString('en-US')} bytes`);
  }

  const ico = buildIco(images);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, ico);

  console.log(`Created dist/factorio.ico (${ico.length.toLocaleString('en-US')} bytes).`);
} finally {
  await rm(temporaryDirectory, { recursive: true, force: true });
}

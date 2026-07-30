const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Create raw RGBA PNG buffer
function createPng(width, height, renderPixel) {
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(height * rowSize);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = renderPixel(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);

  // Helper to construct PNG chunks
  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);

    const crc = crc32(body);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);

    return Buffer.concat([len, body, crcBuf]);
  }

  // Simple CRC32 for PNG chunk integrity
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
    }
    return (c ^ 0xffffffff) >>> 0;
  }

  // Header: 89 50 4E 47 0D 0A 1A 0A
  const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Render school app icon (Dark teal background, gold ring, school emblem)
function renderSchoolIcon(x, y, w, h, isRound = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const radius = w / 2;

  // Round crop for isRound
  if (isRound && dist > radius) {
    return [0, 0, 0, 0]; // Transparent
  }

  // Smooth anti-aliased border corner for square icon
  const cornerRadius = w * 0.22;
  if (!isRound) {
    const innerW = w / 2 - cornerRadius;
    const innerH = h / 2 - cornerRadius;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX > innerW && absY > innerH) {
      const cDx = absX - innerW;
      const cDy = absY - innerH;
      if (Math.sqrt(cDx * cDx + cDy * cDy) > cornerRadius) {
        return [0, 0, 0, 0];
      }
    }
  }

  // Background gradient: #1e3848 to #152d3e
  let r = 30;
  let g = 56;
  let b = 72;

  // Outer Gold Accent Ring
  const outerRingRadius = radius * 0.82;
  const innerRingRadius = radius * 0.76;
  if (dist >= innerRingRadius && dist <= outerRingRadius) {
    return [254, 127, 45, 255]; // Gold / Vibrant Orange #FE7F2D
  }

  // Inner Emblem Circle (White backdrop)
  const emblemRadius = radius * 0.65;
  if (dist <= emblemRadius) {
    const subDist = dist / emblemRadius;
    if (subDist > 0.9) {
      return [33, 94, 97, 255]; // Teal ring border
    }
    
    // Mortarboard / School emblem geometry
    // Mortarboard top diamond: |dy - (-cy*0.15)| + |dx| < radius*0.3
    const capCy = -radius * 0.08;
    const diamondVal = Math.abs(dy - capCy) * 1.5 + Math.abs(dx);
    if (diamondVal <= radius * 0.32) {
      return [30, 56, 72, 255]; // Dark teal mortarboard cap
    }

    // Mortarboard base pillar
    if (dy >= capCy + radius * 0.02 && dy <= capCy + radius * 0.22 && Math.abs(dx) <= radius * 0.14) {
      return [30, 56, 72, 255];
    }

    // Tassel hanging on right side
    if (dx >= radius * 0.22 && dx <= radius * 0.28 && dy >= capCy && dy <= capCy + radius * 0.35) {
      return [254, 127, 45, 255]; // Orange tassel
    }

    return [255, 255, 255, 255]; // White inner disc
  }

  return [r, g, b, 255];
}

// Target Android mipmap directories
const mipmaps = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 },
];

const resDir = path.join(__dirname, '../android/app/src/main/res');

console.log('🚀 Generating custom School App launcher icons for Android...');

mipmaps.forEach(({ dir, size }) => {
  const targetFolder = path.join(resDir, dir);
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  // Square Launcher Icon
  const squarePng = createPng(size, size, (x, y, w, h) => renderSchoolIcon(x, y, w, h, false));
  fs.writeFileSync(path.join(targetFolder, 'ic_launcher.png'), squarePng);

  // Round Launcher Icon
  const roundPng = createPng(size, size, (x, y, w, h) => renderSchoolIcon(x, y, w, h, true));
  fs.writeFileSync(path.join(targetFolder, 'ic_launcher_round.png'), roundPng);

  // Foreground Launcher Icon
  const fgPng = createPng(size, size, (x, y, w, h) => renderSchoolIcon(x, y, w, h, false));
  fs.writeFileSync(path.join(targetFolder, 'ic_launcher_foreground.png'), fgPng);

  console.log(`  ✓ Created icons for ${dir} (${size}x${size})`);
});

// Also create public/icon.png and public/favicon.ico for web PWA
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const pwaIcon = createPng(512, 512, (x, y, w, h) => renderSchoolIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'icon.png'), pwaIcon);
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), createPng(64, 64, (x, y, w, h) => renderSchoolIcon(x, y, w, h, true)));

console.log('✅ Generated public/icon.png (512x512) and public/favicon.ico!');

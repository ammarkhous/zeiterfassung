const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const ACCENT = '#1F3A2E';
const LIME = '#A9D977';
const WHITE = '#FFFFFF';
const TRACK = 'rgba(255, 255, 255, 0.14)';

const roundedRect = (ctx, x, y, w, h, r) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

// The mark: a bold "Z" whose diagonal is a gentle stopwatch-sweep curve,
// set against a partial progress ring (echoing the app's live timer ring)
// with a glowing lime "comet" dot at the sweep's leading tip - the same
// visual language as the running timer, distilled into a monogram.
const drawIcon = (size) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  roundedRect(ctx, 0, 0, size, size, size * 0.22);
  ctx.fillStyle = ACCENT;
  ctx.fill();

  const cx = size * 0.5;
  const cy = size * 0.5;
  const ringRadius = size * 0.4;
  const ringWidth = size * 0.045;

  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
  ctx.strokeStyle = TRACK;
  ctx.lineWidth = ringWidth;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, ringRadius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * 0.7);
  ctx.strokeStyle = LIME;
  ctx.lineWidth = ringWidth;
  ctx.stroke();

  const barWidth = size * 0.09;
  const barX1 = size * 0.28;
  const barX2 = size * 0.72;

  ctx.strokeStyle = WHITE;
  ctx.lineWidth = barWidth;

  ctx.beginPath();
  ctx.moveTo(barX1, size * 0.32);
  ctx.lineTo(barX2, size * 0.32);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(barX1, size * 0.68);
  ctx.lineTo(barX2, size * 0.68);
  ctx.stroke();

  const diagStartX = size * 0.7;
  const diagStartY = size * 0.36;
  const diagEndX = size * 0.3;
  const diagEndY = size * 0.64;
  const ctrlX = size * 0.557;
  const ctrlY = size * 0.418;

  ctx.beginPath();
  ctx.moveTo(diagStartX, diagStartY);
  ctx.quadraticCurveTo(ctrlX, ctrlY, diagEndX, diagEndY);
  ctx.stroke();

  ctx.shadowColor = LIME;
  ctx.shadowBlur = size * 0.1;
  ctx.beginPath();
  ctx.arc(diagStartX, diagStartY, size * 0.06, 0, Math.PI * 2);
  ctx.fillStyle = LIME;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(diagStartX, diagStartY, size * 0.036, 0, Math.PI * 2);
  ctx.fillStyle = WHITE;
  ctx.fill();

  return canvas;
};

// A small raw "PNG-in-ICO" packer - the ICO format has allowed embedded
// PNG payloads (instead of raw BMP data) since Windows Vista, so no
// external ICO-encoding dependency is needed for a modern favicon.
const buildIco = (pngBuffers) => {
  const count = pngBuffers.length;
  const headerSize = 6 + count * 16;
  let offset = headerSize;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);

  pngBuffers.forEach(({ size, buffer }, i) => {
    const entryOffset = 6 + i * 16;
    header.writeUInt8(size >= 256 ? 0 : size, entryOffset + 0);
    header.writeUInt8(size >= 256 ? 0 : size, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2);
    header.writeUInt8(0, entryOffset + 3);
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(buffer.length, entryOffset + 8);
    header.writeUInt32LE(offset, entryOffset + 12);
    offset += buffer.length;
  });

  return Buffer.concat([header, ...pngBuffers.map((p) => p.buffer)]);
};

for (const size of [192, 512]) {
  const canvas = drawIcon(size);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(iconsDir, `icon-${size}.png`), buffer);
  console.log(`Erstellt: icon-${size}.png`);
}

const faviconSizes = [16, 32, 48];
const faviconPngs = faviconSizes.map((size) => ({
  size,
  buffer: drawIcon(size).toBuffer('image/png'),
}));
const icoBuffer = buildIco(faviconPngs);
const faviconPath = path.join(__dirname, '..', 'src', 'app', 'favicon.ico');
fs.writeFileSync(faviconPath, icoBuffer);
console.log('Erstellt: favicon.ico');

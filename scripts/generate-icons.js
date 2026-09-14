const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const drawIcon = (size) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0F1117';
  ctx.fillRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.32;

  ctx.strokeStyle = '#E8EAF0';
  ctx.lineWidth = size * 0.045;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = '#4F8EF7';
  ctx.lineCap = 'round';

  ctx.lineWidth = size * 0.045;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx, cy - radius * 0.6);
  ctx.stroke();

  ctx.lineWidth = size * 0.035;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + radius * 0.45, cy + radius * 0.2);
  ctx.stroke();

  ctx.fillStyle = '#E8EAF0';
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.02, 0, Math.PI * 2);
  ctx.fill();

  return canvas;
};

for (const size of [192, 512]) {
  const canvas = drawIcon(size);
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), buffer);
  console.log(`Erstellt: icon-${size}.png`);
}

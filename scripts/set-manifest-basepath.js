const fs = require('fs');
const path = require('path');

const basePath = process.argv[2] || '';
const manifestPath = path.join(__dirname, '..', 'public', 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

manifest.start_url = `${basePath}/`;
manifest.icons = manifest.icons.map((icon) => ({
  ...icon,
  src: `${basePath}${icon.src}`,
}));

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`manifest.json auf basePath "${basePath}" angepasst.`);

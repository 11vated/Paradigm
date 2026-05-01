const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

const entries = fs.readdirSync('repo_latest');
for (const entry of entries) {
  if (entry === 'node_modules' || entry === '.git') continue;
  copyRecursiveSync(path.join('repo_latest', entry), path.join('.', entry));
}
console.log('Sync complete.');

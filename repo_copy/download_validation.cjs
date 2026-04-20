const fs = require('fs');
const path = require('path');
const https = require('https');

const REPO_URL = 'https://api.github.com/repos/11vated/PAradigm-reference/git/trees/main?recursive=1';
const RAW_BASE_URL = 'https://raw.githubusercontent.com/11vated/PAradigm-reference/main/';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Node.js' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching tree...');
  const treeData = await fetchJson(REPO_URL);
  const files = treeData.tree.filter(t => t.path.startsWith('seed-commons/validation/') && t.path.endsWith('.ts'));
  
  for (const file of files) {
    const targetPath = path.join(__dirname, 'data', file.path);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    console.log(`Downloading ${file.path}...`);
    const content = await fetchText(RAW_BASE_URL + file.path);
    fs.writeFileSync(targetPath, content);
  }
  console.log('Done downloading validation scripts.');
}

main().catch(console.error);

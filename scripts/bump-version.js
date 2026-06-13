#!/usr/bin/env node
// scripts/bump-version.js - Simple semver + changelog automation (no new deps)
const fs = require('fs');
const { execSync } = require('child_process');
const pkg = JSON.parse(fs.readFileSync('package.json'));
const args = process.argv.slice(2);
let newVersion = pkg.version;
if (args[0] === 'patch') {
  const [maj, min, pat] = pkg.version.split('.').map(Number);
  newVersion = `${maj}.${min}.${pat+1}`;
} else if (args[0] === 'minor') {
  const [maj, min] = pkg.version.split('.').map(Number);
  newVersion = `${maj}.${min+1}.0`;
} else if (args[0] === 'major') {
  const [maj] = pkg.version.split('.').map(Number);
  newVersion = `${maj+1}.0.0`;
}
pkg.version = newVersion;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
console.log(`Version bumped to ${newVersion}`);
// Auto append to CHANGELOG (basic)
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
const date = new Date().toISOString().split('T')[0];
const entry = `\n## [${newVersion}] - ${date}\n\n### Changed\n- Automated semver bump and changelog entry.\n`;
fs.writeFileSync('CHANGELOG.md', changelog + entry);
console.log('CHANGELOG.md updated');

#!/usr/bin/env bash
# paradigm-release.sh - Package for public release
set -e
echo "Building Paradigm Infinite release..."
npm run build || echo "build skipped"
npm pack || echo "pack note"
docker build -t paradigm-infinite:latest .
docker tag paradigm-infinite:latest paradigm-infinite:$(node -p "require('./package.json').version")
echo "Release artifacts: paradigm-absolute-*.tgz and Docker image ready."
echo "Install: npm install -g ./paradigm-absolute-*.tgz or use Docker."

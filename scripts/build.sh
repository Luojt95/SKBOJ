#!/bin/bash
set -Eeuo pipefail

echo "Installing dependencies with devDependencies..."
pnpm install --prod=false

echo "Building the Next.js project..."
pnpm next build

echo "Build completed successfully!"

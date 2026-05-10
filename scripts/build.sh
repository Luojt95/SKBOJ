#!/bin/bash
set -Eeuo pipefail

echo "Installing dependencies..."
pnpm install

echo "Building the Next.js project..."
NEXT_PRIVATE_NO_TURBOPACK=1 pnpm next build

echo "Build completed successfully!"

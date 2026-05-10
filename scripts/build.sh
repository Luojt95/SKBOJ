#!/bin/bash
set -Eeuo pipefail

echo "Building the Next.js project..."
pnpm next build --no-lint --no-typescript

echo "Build completed successfully!"

#!/bin/bash
set -Eeuo pipefail

echo "Installing dependencies with devDependencies..."
pnpm install --prod=false

# Temporarily disable .babelrc to use SWC for production build
if [ -f ".babelrc" ]; then
  echo "Temporarily moving .babelrc aside for SWC build..."
  mv .babelrc .babelrc.buildbak
fi

echo "Building the Next.js project with Webpack..."
pnpm next build --webpack
BUILD_EXIT=$?

# Restore .babelrc
if [ -f ".babelrc.buildbak" ]; then
  echo "Restoring .babelrc..."
  mv .babelrc.buildbak .babelrc
fi

if [ $BUILD_EXIT -ne 0 ]; then
  echo "Build failed!"
  exit $BUILD_EXIT
fi

echo "Build completed successfully!"

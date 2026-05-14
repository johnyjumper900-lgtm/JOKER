#!/bin/bash

# 1. Build
npm run build

# 2. Setup mobile-dist
rm -rf mobile-dist
mkdir -p mobile-dist/assets

# Assuming dist/ is the build output
cp -r dist/* mobile-dist/

# 3. Force assets
if [ -f src/assets/ball.png ]; then
  cp -f src/assets/ball.png mobile-dist/assets/ball.png
fi

echo "Mobile distribution prepared in mobile-dist/"

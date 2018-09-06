#!/bin/sh
set -e
rm -rf node_modules
npm install
npm test
npm version $@
npm run build
cd dist
npm publish

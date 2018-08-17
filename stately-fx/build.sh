#!/bin/sh
rm -rf dist
mkdir dist
tsc -d
typedoc src/ --out dist/docs --exclude '**/*.spec.*'
cp -r src/ dist/src
cp package.json dist/
cp .npmrc dist/
cp README.md dist/

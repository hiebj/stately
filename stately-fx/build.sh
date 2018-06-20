#!/bin/sh
rm -rf dist
mkdir dist
tsc -d
cp -r src/ dist/src
cp package.json dist/
cp .npmrc dist/
cp README.md dist/

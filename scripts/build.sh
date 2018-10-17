#!/bin/sh
set -e
rm -rf dist
mkdir dist
tsc
cp -r src/ dist/src
cp package.json dist/
cp ../../.npmrc dist/
cp README.md dist/

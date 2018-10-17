#!/bin/sh
set -e
rm -rf dist
mkdir dist
tsc
typedoc src/ --out dist/docs --exclude '**/*.spec.*'
cp -r src/ dist/src
cp package.json dist/
cp ../.npmrc dist/
cp README.md dist/
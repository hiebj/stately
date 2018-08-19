#!/bin/sh
set -e
rm -rf node_modules
yarn install
yarn test
npm version $@
yarn build
git push && git push --tags
cd dist
npm publish
cat package.json | grep version

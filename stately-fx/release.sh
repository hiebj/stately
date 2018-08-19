#!/bin/sh
set -e
rm -rf node_modules
yarn install
yarn test
npm version $@
yarn build
#git push && git push --tags
echo "pushing"
cd dist
#npm publish
echo "publishing"
cat package.json | grep version

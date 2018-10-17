#!/bin/sh
set -e
rm -rf node_modules
npm install
npm test
newversion=$(npm version $@)
npm run build
blue=$'\033[0;36m'
noColor=$'\033[0m'
read -rsp "About to publish ${blue}${npm_package_name} ${newversion}${noColor}"$'.\nPress Enter to continue or Ctrl+C to cancel.'
cd dist
npm publish

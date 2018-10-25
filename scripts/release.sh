#!/bin/sh
set -e
rm -rf node_modules
npm install
npm test
blue=$'\033[0;36m'
underline=$'\033[4m'
noformat=$'\033[0m'
newversion=$(npm version $@ | cut -c 2-)
npm run build
read -rsp "About to publish ${blue}${underline}${npm_package_name}@${newversion}${noformat}"$'.\nPress Enter to continue or Ctrl+C to cancel.'
git add package*.json
git commit -m "${npm_package_name}@${newversion}"
cd dist
npm publish

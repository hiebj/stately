#!/bin/sh
set -e
changedFiles=$(git diff --cached --name-only --diff-filter=ACM | grep '\.[tj]sx\?$' | tr '\n' ' ')
[ -z "$changedFiles" ] && exit 0

echo "$changedFiles" | xargs npm run prettier --write
echo "$changedFiles" | xargs git add

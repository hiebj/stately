#!/bin/sh
changedFiles=$(git diff --cached --name-only --diff-filter=ACM | grep '\.[tj]sx\?$' | tr '\n' ' ')
[ -z "$changedFiles" ] && exit 0

echo "$changedFiles" | xargs ./node_modules/.bin/tslint -c tslint.json --exclude 'src/**/*.d.ts' --fix
tslintExitCode=$?
if [ $tslintExitCode -ne 0 ]
then
  exit $tslintExitCode
fi

echo "$changedFiles" | xargs ./node_modules/.bin/prettier --write
prettierExitCode=$?
if [ $prettierExitCode -ne 0 ]
then
  exit $prettierExitCode
fi

echo "$changedFiles" | xargs git add
exit 0

#!/usr/bin/env bash
# Compile the pure progression modules and run the checks against them.
# They have no React and no DOM, so they run under plain node once the
# extensionless TypeScript imports are given extensions.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
rm -rf .progression
# tsc cannot resolve the @/ alias from the command line, so it reports the
# import as unresolved and exits non-zero — but it still emits the JS, and the
# sed below rewrites that import to a real relative path. Type correctness is
# `npm run typecheck`'s job; this step only needs runnable output.
npx tsc --ignoreConfig \
  src/lib/reef/progression.ts src/lib/reef/species.ts src/lib/reef/types.ts src/lib/tank/types.ts \
  --outDir .progression --module esnext --target es2022 --moduleResolution bundler --skipLibCheck \
  > /dev/null 2>&1 || true
find .progression -name '*.js' -print0 | xargs -0 sed -i '' -E \
  "s|from '(\./[a-z]+)'|from '\1.js'|g; s|from '@/lib/tank/types'|from '../tank/types.js'|g"
node scripts/progression-check.mjs

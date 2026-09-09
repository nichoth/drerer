# Build explicit JavaScript artifacts

**Status:** ready-for-agent
**Blocked by:** None
**Touches:** `package.json`, `scripts/build.mjs`, `tsconfig.build.json`,
`src/index.ts`, `src/fill/index.ts`, `src/fill/worker.ts`

## Acceptance criteria

- [ ] `npm run build` emits readable and minified ESM, CommonJS, and UMD main
  artifacts with the names in the distribution spec.
- [ ] Every minified artifact is bundled and has an external source map.
- [ ] The readable CommonJS artifact loads under the package's `type: module`
  setting without requiring ESM siblings.
- [ ] Fill-worker ESM/CommonJS artifacts are emitted, with bundled minified
  variants and source maps.

## Comments

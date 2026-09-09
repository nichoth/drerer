# Verify loading and packaging

**Status:** ready-for-agent
**Blocked by:** 01, 02
**Touches:** `test/index.ts`, `test/package-exports.ts`, `package.json`

## Acceptance criteria

- [ ] Tests load readable and minified ESM and CommonJS artifacts through the
  package export map.
- [ ] Tests load readable and minified UMD artifacts and compare their public
  API with the ESM API.
- [ ] Tests validate fill-worker artifact presence and worker-like loading.
- [ ] Tests reject accidental wildcard/internal-module exports.
- [ ] Tests verify source-map references and the `npm pack --dry-run` surface.

## Comments

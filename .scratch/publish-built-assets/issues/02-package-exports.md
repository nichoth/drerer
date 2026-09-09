# Export the published artifact surface

**Status:** ready-for-agent
**Blocked by:** 01
**Touches:** `package.json`, `README.md`

## Acceptance criteria

- [ ] The root export selects ESM for `import` and `default`, and CommonJS for
  `require`.
- [ ] `./min`, `./umd`, `./umd/min`, and `./fill` resolve to their declared
  artifacts.
- [ ] The wildcard export is removed.
- [ ] Compatibility metadata points to the readable ESM, readable CommonJS,
  declarations, and minified UMD artifacts as specified.
- [ ] The package is publishable and `npm pack --dry-run` includes the intended
  distribution files.

## Comments

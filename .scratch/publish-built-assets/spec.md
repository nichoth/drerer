# Publish complete JavaScript build artifacts

Status: needs-triage

## Goal

Publish ESM, CommonJS, and UMD artifacts in readable and minified forms, with
package exports that route consumers to the right artifact.

## Settled distribution contract

### Main artifacts

| Format | Readable | Minified | Bundle requirement |
| --- | --- | --- | --- |
| ESM | `dist/drerer.esm.js` | `dist/drerer.esm.min.js` | Minified only |
| CommonJS | `dist/drerer.cjs` | `dist/drerer.cjs.min.cjs` | Both |
| UMD | `dist/drerer.umd.js` | `dist/drerer.umd.min.js` | Both |

The minified ESM and UMD files end in `.min.js`. CommonJS uses `.cjs` so Node
can load it correctly under the package's top-level `"type": "module"`.

### Fill worker artifacts

The existing fill-worker entry remains separate from the main module:

- `dist/drerer.fill.esm.js`
- `dist/drerer.fill.esm.min.js`
- `dist/drerer.fill.cjs`
- `dist/drerer.fill.cjs.min.cjs`

Minified fill-worker artifacts are bundled. No UMD fill-worker artifact is
required.

### Package routing

The export map should expose:

- `drerer` — ESM for `import` and `default`, CommonJS for `require`.
- `drerer/min` — bundled minified ESM/CommonJS equivalents.
- `drerer/umd` — readable UMD through `default`.
- `drerer/umd/min` — minified UMD through `default`.
- `drerer/fill` — the fill-worker ESM/CommonJS equivalents.

The broad wildcard export should be removed. The root ESM artifact is the
browser/default package resolution. `main`, `module`, `types`, `unpkg`, and
`jsdelivr` should remain as compatibility metadata, with `unpkg` and
`jsdelivr` pointing to `dist/drerer.umd.min.js`. `private: true` must be
removed before publishing.

## Implementation plan

### 1. Replace shell-glob builds with explicit build orchestration

Create a dedicated build script using the esbuild API. It should:

1. Remove the existing `dist` contents.
2. Emit TypeScript declarations and declaration maps once.
3. Emit the readable ESM module tree and its named entry artifact.
4. Emit a bundled readable CommonJS entry artifact.
5. Emit bundled minified ESM and CommonJS artifacts.
6. Emit bundled readable and minified UMD artifacts with the `drerer` global.
7. Emit the separate fill-worker ESM/CommonJS artifacts, bundling its
   minified variants.
8. Emit external source maps for every JavaScript artifact.

The build should name entry points explicitly and avoid `src/*.ts` and
`src/**/*.ts` globs as the mechanism that defines the public package surface.
The readable ESM entry may reference the emitted readable module tree; the
minified ESM entry must be a standalone bundle.

### 2. Define package exports and compatibility fields

Update `package.json` so its explicit export map contains `types`, `import`,
`require`, and `default` conditions where applicable. The root and `./min`
entries use ESM as the `default` condition. UMD entries use only their UMD
default file. Add `./package.json` only if package metadata access is needed.

Set compatibility fields as follows:

- `main`: `dist/drerer.cjs`
- `module`: `dist/drerer.esm.js`
- `types`: `dist/index.d.ts`
- `unpkg`: `dist/drerer.umd.min.js`
- `jsdelivr`: `dist/drerer.umd.min.js`

Keep only the intended published files under `files`, preferably by including
the `dist` directory rather than relying on a wildcard export.

### 3. Add artifact and export-resolution tests

Add package-level tests that build into a temporary package-like directory and
verify:

- root ESM import resolves and exposes the default and named API;
- root CommonJS require resolves the same API;
- minified ESM import and minified CommonJS require resolve the same API;
- readable and minified UMD files create `globalThis.drerer` with the same API;
- all explicit subpaths resolve to the intended files;
- fill-worker artifacts are present, bundled when minified, and have valid
  source-map references;
- no wildcard export accidentally exposes internal modules;
- `npm pack --dry-run` includes the declared artifacts and declarations.

Use a worker-like runtime fixture for the fill-worker smoke test rather than
executing it directly in ordinary Node globals.

### 4. Update release documentation

Update `README.md` to document root ESM/CommonJS usage, minified subpaths,
UMD usage, the `drerer` browser global, CDN usage, and the fill-worker entry.
Document that minified files are standalone bundles and that the readable ESM
entry retains module imports.

## Acceptance criteria

- [ ] `npm run build` creates every declared main and fill-worker artifact.
- [ ] Every minified JavaScript artifact is standalone and bundled.
- [ ] `require` can load the CommonJS artifacts under `"type": "module"`.
- [ ] ESM is the root package default and UMD is available by explicit path.
- [ ] UMD artifacts expose the same public API under `globalThis.drerer`.
- [ ] Every JavaScript artifact has an external source map.
- [ ] Package-level tests validate all export conditions and subpaths.
- [ ] `npm pack --dry-run` contains only the intended distribution surface.
- [ ] The package is no longer marked private.

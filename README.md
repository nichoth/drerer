# drerer
[![tests](https://img.shields.io/github/actions/workflow/status/nichoth/drerer/nodejs.yml?style=flat-square)](https://github.com/nichoth/drerer/actions/workflows/nodejs.yml)
[![types](https://img.shields.io/npm/types/@substrate-system/icons?style=flat-square)](README.md)
[![module](https://img.shields.io/badge/module-ESM%2FCJS-blue?style=flat-square)](README.md)
[![semantic versioning](https://img.shields.io/badge/semver-2.0.0-blue?logo=semver&style=flat-square)](https://semver.org/)
[![Common Changelog](https://nichoth.github.io/badge/common-changelog.svg)](./CHANGELOG.md)
[![install size](https://flat.badgen.net/packagephobia/install/@nichoth/session-cookie)](https://packagephobia.com/result?p=@nichoth/session-cookie)
[![gzip size](https://flat.badgen.net/bundlephobia/minzip/@substrate-system/routes)](https://bundlephobia.com/package/@substrate-system/routes)
[![dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen.svg?style=flat-square)](package.json)
[![license](https://img.shields.io/badge/license-Big_Time-blue?style=flat-square)](LICENSE)


`<package description goes here>`

[See a live demo](https://namespace.github.io/package-name/)

<details><summary><h2>Contents</h2></summary>
<!-- toc -->
</details>

## Install

Installation instructions

```sh
npm i -S drerer
```

## Example

`usage instructions here`

### JS
```js
import Atrament, { MODE_DRAW } from 'drerer'
```

## Modules

This exposes ESM and common JS via [package.json `exports` field](https://nodejs.org/api/packages.html#exports).

The minified files are standalone bundles — all of their code is included in
the same file. The readable ESM entry (`import 'drerer'`) is the only artifact
that keeps module imports, referencing the readable module tree shipped in
`dist`.

### ESM
```js
import Atrament from 'drerer'
```

### Common JS
```js
const Atrament = require('drerer')
```

### Minified

Minified, bundled equivalents of the above:

```js
import Atrament from 'drerer/min'
```

```js
const Atrament = require('drerer/min')
```

### UMD

A UMD bundle is available by explicit path, readable or minified:

```js
const Atrament = require('drerer/umd')
```

```js
const Atrament = require('drerer/umd/min')
```

Loaded in a browser, both create the same API on the `drerer` global:

```html
<script src="./node_modules/drerer/dist/drerer.umd.min.js"></script>
<script>
    const atrament = new drerer.default('#canvas')
</script>
```

### CDN

The minified UMD bundle is also what `unpkg` and `jsdelivr` serve:

```html
<script src="https://unpkg.com/drerer/dist/drerer.umd.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/drerer/dist/drerer.umd.min.js"></script>
```

### Fill worker

The fill-worker entry — used for flood filling outside the main drawing
module — is exposed separately, as ESM or CommonJS:

```js
import FillWorker from 'drerer/fill'
```

```js
const FillWorker = require('drerer/fill')
```

Pass it to the `Atrament` constructor via the `fill` option.

### pre-built JS
This package exposes minified JS files too. Copy them to a location that is
accessible to your web server, then link to them in HTML.

#### copy
```sh
cp ./node_modules/drerer/dist/drerer.umd.min.js ./public
```

#### HTML
```html
<script type="module" src="./drerer.umd.min.js"></script>
```

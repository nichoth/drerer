// Package-level tests for the published distribution artifacts.
// Builds the package into a temporary package-like directory, then verifies
// every export condition, subpath, artifact, and source-map reference.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

// Build into a temporary package-like directory.
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'drerer-package-'))
const pkgDir = path.join(tmp, 'pkg')
fs.mkdirSync(pkgDir)
fs.writeFileSync(
    path.join(pkgDir, 'package.json'),
    JSON.stringify(pkg, null, 2)
)

execFileSync(
    process.execPath,
    [path.join(root, 'scripts', 'build.mjs'), path.join(pkgDir, 'dist')],
    { stdio:'inherit' }
)

test.after(() => {
    fs.rmSync(tmp, { recursive:true, force:true })
})

const expectedApi = {
    default:'function',
    MODE_DRAW:'string',
    MODE_ERASE:'string',
    MODE_FILL:'string',
    MODE_DISABLED:'string',
}

const runNode = (file) => execFileSync(process.execPath, [file], { cwd:pkgDir }).toString()
const writeFile = (name, content) => {
    const filePath = path.join(pkgDir, name)
    fs.writeFileSync(filePath, content)
    return filePath
}
const readArtifact = (name) => fs.readFileSync(path.join(pkgDir, 'dist', name), 'utf8')
const artifactExists = (name) => fs.existsSync(path.join(pkgDir, 'dist', name))

const checkScript = (imports) => `
const api = (mod) => ({
    default: typeof mod.default,
    MODE_DRAW: mod.MODE_DRAW,
    MODE_ERASE: mod.MODE_ERASE,
    MODE_FILL: mod.MODE_FILL,
    MODE_DISABLED: mod.MODE_DISABLED,
})
${imports}
`

test('package is not private and routes exports explicitly', () => {
    assert.equal(pkg.private, undefined)
    assert.deepEqual(Object.keys(pkg.exports), ['.', './min', './umd', './umd/min', './fill'])
    assert.ok(!Object.keys(pkg.exports).some((key) => key.includes('*')), 'no wildcard export')
})

test('root ESM import resolves and exposes the API', () => {
    const file = writeFile('check-esm-root.mjs', checkScript(`
import Atrament, { MODE_DRAW, MODE_ERASE, MODE_FILL, MODE_DISABLED } from 'drerer'
console.log(JSON.stringify(api({ default:Atrament, MODE_DRAW, MODE_ERASE, MODE_FILL, MODE_DISABLED })))
    `))
    const result = JSON.parse(runNode(file))
    assert.equal(result.default, 'function')
    assert.equal(result.MODE_DRAW, 'draw')
    assert.equal(result.MODE_ERASE, 'erase')
    assert.equal(result.MODE_FILL, 'fill')
    assert.equal(result.MODE_DISABLED, 'disabled')
})

test('root CommonJS require resolves the same API', () => {
    const file = writeFile('check-cjs-root.cjs', `
const api = (mod) => ({
    default: typeof mod.default,
    MODE_DRAW: mod.MODE_DRAW,
    MODE_ERASE: mod.MODE_ERASE,
    MODE_FILL: mod.MODE_FILL,
    MODE_DISABLED: mod.MODE_DISABLED,
})
const drerer = require('drerer')
console.log(JSON.stringify(api(drerer)))
    `)
    const result = JSON.parse(runNode(file))
    assert.deepEqual(result, { default:'function', MODE_DRAW:'draw', MODE_ERASE:'erase', MODE_FILL:'fill', MODE_DISABLED:'disabled' })
})

test('minified ESM import and minified CommonJS require resolve the same API', () => {
    const esmFile = writeFile('check-esm-min.mjs', checkScript(`
import Atrament, { MODE_DRAW, MODE_ERASE, MODE_FILL, MODE_DISABLED } from 'drerer/min'
console.log(JSON.stringify(api({ default:Atrament, MODE_DRAW, MODE_ERASE, MODE_FILL, MODE_DISABLED })))
    `))
    const esmResult = JSON.parse(runNode(esmFile))
    assert.deepEqual(esmResult, { default:'function', MODE_DRAW:'draw', MODE_ERASE:'erase', MODE_FILL:'fill', MODE_DISABLED:'disabled' })

    const cjsFile = writeFile('check-cjs-min.cjs', `
const drerer = require('drerer/min')
console.log(JSON.stringify({
    default: typeof drerer.default,
    MODE_DRAW: drerer.MODE_DRAW,
    MODE_ERASE: drerer.MODE_ERASE,
    MODE_FILL: drerer.MODE_FILL,
    MODE_DISABLED: drerer.MODE_DISABLED,
}))
    `)
    const cjsResult = JSON.parse(runNode(cjsFile))
    assert.deepEqual(cjsResult, { default:'function', MODE_DRAW:'draw', MODE_ERASE:'erase', MODE_FILL:'fill', MODE_DISABLED:'disabled' })
})

test('readable and minified UMD files create globalThis.drerer with the same API as ESM', async () => {
    // The reference API comes from the readable ESM artifact itself.
    const esm = await import(pathToFileURL(path.join(pkgDir, 'dist', 'drerer.esm.js')))
    const esmApi = {
        default: typeof esm.default,
        ...Object.fromEntries(Object.keys(esm)
            .filter((key) => key !== 'default')
            .map((key) => [key, esm[key]])),
    }

    const loadUmd = (name) => {
        const context = vm.createContext({})
        vm.runInContext(readArtifact(name), context)
        return context.drerer
    }

    for (const name of ['drerer.umd.js', 'drerer.umd.min.js']) {
        const api = loadUmd(name)
        const umdApi = {
            default: typeof api.default,
            ...Object.fromEntries(Object.keys(api)
                .filter((key) => key !== 'default')
                .map((key) => [key, api[key]])),
        }
        assert.deepEqual(
            Object.keys(umdApi).sort(),
            Object.keys(esmApi).sort(),
            `${name} exposes the same named exports as the ESM artifact`
        )
        assert.deepEqual(umdApi, esmApi, `${name} exposes the same API as the ESM artifact`)
    }
})

test('explicit subpaths resolve to the intended files', () => {
    const resolveCases = [
        ['.', 'dist/drerer.cjs'],
        ['./min', 'dist/drerer.cjs.min.cjs'],
        ['./fill', 'dist/drerer.fill.cjs'],
        ['./umd', 'dist/drerer.umd.js'],
        ['./umd/min', 'dist/drerer.umd.min.js'],
    ]
    const file = writeFile('check-paths.cjs', `
const { createRequire } = require('node:module')
const require2 = createRequire(__filename)
const results = {}
for (const [subpath] of ${JSON.stringify(resolveCases)}) {
    const target = subpath === '.' ? 'drerer' : 'drerer' + subpath.slice(1)
    results[subpath] = require2.resolve(target).split('pkg').pop()
}
console.log(JSON.stringify(results))
    `)
    const results = JSON.parse(runNode(file))
    for (const [subpath, expected] of resolveCases) {
        assert.equal(results[subpath], '/' + expected, `subpath ${subpath} resolves to ${expected}`)
    }
})

test('ESM subpaths resolve to the intended files', () => {
    const file = writeFile('check-esm-paths.mjs', `
const results = {}
for (const subpath of ['.', './min', './fill']) {
    const target = subpath === '.' ? 'drerer' : 'drerer' + subpath.slice(1)
    results[subpath] = (await import.meta.resolve(target)).split('pkg').pop()
}
console.log(JSON.stringify(results))
    `)
    const results = JSON.parse(runNode(file))
    assert.equal(results['.'], '/dist/drerer.esm.js')
    assert.equal(results['./min'], '/dist/drerer.esm.min.js')
    assert.equal(results['./fill'], '/dist/drerer.fill.esm.js')
})

test('no wildcard export exposes internal modules', async () => {
    const file = writeFile('check-wildcard.mjs', `
const attempts = {}
for (const subpath of ['./mouse.js', './dist/index.js', './src/index.ts']) {
    try {
        await import('drerer' + subpath)
        attempts[subpath] = 'resolved'
    } catch {
        attempts[subpath] = 'blocked'
    }
}
console.log(JSON.stringify(attempts))
    `)
    const attempts = JSON.parse(runNode(file))
    for (const subpath of Object.keys(attempts)) {
        assert.equal(attempts[subpath], 'blocked', `${subpath} must not resolve`)
    }
})

test('fill-worker artifacts are present, bundled when minified, with valid source maps', () => {
    const fillArtifacts = [
        'drerer.fill.esm.js',
        'drerer.fill.esm.min.js',
        'drerer.fill.cjs',
        'drerer.fill.cjs.min.cjs',
    ]

    for (const name of fillArtifacts) {
        assert.ok(artifactExists(name), `${name} exists`)
        const content = readArtifact(name)
        assert.ok(!/from\s*["']\.\.?\/|require\(["']\.\.?\//.test(content), `${name} is bundled`)
        const mapName = name + '.map'
        assert.ok(artifactExists(mapName), `${mapName} exists`)
        assert.ok(
            content.includes(`//# sourceMappingURL=${mapName}`),
            `${name} references its external source map`
        )
        const map = JSON.parse(readArtifact(mapName))
        assert.ok(Array.isArray(map.sources) && map.sources.length > 0, `${mapName} has sources`)
    }
})

test('fill-worker smoke test in a worker-like runtime', async () => {
    const file = writeFile('check-fill.mjs', `
import vm from 'node:vm'

// Worker-like runtime fixture: the fill entry constructs a Worker from a
// Blob, so fake the browser globals the artifact touches.
let workerSource = null
let workerCreated = false
class FakeWorker {
    constructor () { workerCreated = true }
}
globalThis.Worker = FakeWorker
class FakeBlob {
    constructor (parts) { workerSource = parts.join('') }
}
globalThis.Blob = FakeBlob
class FakeURL {
    static createObjectURL () { return 'blob:drerer-fake' }
}
globalThis.URL = FakeURL

const { default: FillWorker } = await import('drerer/fill')
new FillWorker()

if (!workerCreated) throw new Error('fill entry did not create a worker')
if (!workerSource) throw new Error('fill entry did not embed worker source')

// Run the embedded worker source in a worker-like sandbox.
const sandbox = {
    addEventListener: (type, fn) => { sandbox['__listener_' + type] = fn },
    postMessage: (data) => { sandbox.__posted = data },
}
const context = vm.createContext(sandbox)
vm.runInContext(workerSource, context)
if (!sandbox.__listener_message) throw new Error('worker did not register a message listener')

vm.runInContext(\`
    globalThis.__message = {
        data: {
            image: new Uint8ClampedArray([
                255, 255, 255, 255,   255, 255, 255, 255,
                255, 255, 255, 255,   255, 255, 255, 255,
            ]),
            width: 2,
            height: 2,
            color: '#ff0000',
            globalAlpha: 1,
            startX: 0,
            startY: 0,
            startColor: [255, 255, 255, 255],
        },
    }
    __listener_message(globalThis.__message)
\`, context)

const posted = sandbox.__posted
if (!posted || posted.type !== 'fill-result') {
    throw new Error('worker did not post a fill-result message: ' + JSON.stringify(posted))
}
const [r, g, b, a] = posted.result
console.log(JSON.stringify({ r, g, b, a }))
    `)
    const result = JSON.parse(runNode(file))
    assert.deepEqual(result, { r:255, g:0, b:0, a:255 })
})

test('every JavaScript artifact has an external source map', () => {
    const artifacts = [
        'drerer.esm.js',
        'drerer.esm.min.js',
        'drerer.cjs',
        'drerer.cjs.min.cjs',
        'drerer.umd.js',
        'drerer.umd.min.js',
        'drerer.fill.esm.js',
        'drerer.fill.esm.min.js',
        'drerer.fill.cjs',
        'drerer.fill.cjs.min.cjs',
    ]
    for (const name of artifacts) {
        assert.ok(artifactExists(name), `${name} exists`)
        const content = readArtifact(name)
        assert.ok(
            content.includes(`//# sourceMappingURL=${name}.map`),
            `${name} references its external source map`
        )
        assert.ok(artifactExists(name + '.map'), `${name}.map exists`)
    }
})

test('main artifacts are standalone bundles except the readable ESM entry', () => {
    // The readable ESM entry references the emitted readable module tree.
    assert.ok(readArtifact('drerer.esm.js').includes('from "./index.js"'))

    // Everything else must be self-contained.
    for (const name of [
        'drerer.esm.min.js',
        'drerer.cjs',
        'drerer.cjs.min.cjs',
        'drerer.umd.js',
        'drerer.umd.min.js',
    ]) {
        const content = readArtifact(name)
        assert.ok(
            !/from\s*["']\.\.?\/|require\(["']\.\.?\//.test(content),
            `${name} must not import from sibling files`
        )
    }
})

test('declarations are emitted', () => {
    assert.ok(artifactExists('index.d.ts'), 'dist/index.d.ts exists')
    assert.ok(artifactExists('index.d.ts.map'), 'dist/index.d.ts.map exists')
    assert.ok(artifactExists('fill/index.d.ts'), 'dist/fill/index.d.ts exists')
})

test('npm pack --dry-run includes only the intended distribution surface', () => {
    const output = execFileSync('npm', ['pack', '--dry-run', '--json'], { cwd:pkgDir }).toString()
    const [{ files }] = JSON.parse(output)
    const paths = files.map((file) => file.path)

    const expected = [
        'dist/drerer.esm.js',
        'dist/drerer.esm.min.js',
        'dist/drerer.cjs',
        'dist/drerer.cjs.min.cjs',
        'dist/drerer.umd.js',
        'dist/drerer.umd.min.js',
        'dist/drerer.fill.esm.js',
        'dist/drerer.fill.esm.min.js',
        'dist/drerer.fill.cjs',
        'dist/drerer.fill.cjs.min.cjs',
        'dist/index.d.ts',
        'dist/fill/index.d.ts',
    ]
    for (const name of expected) {
        assert.ok(paths.includes(name), `packed files include ${name}`)
    }

    const forbidden = paths.filter((filePath) => (
        filePath.startsWith('src/') ||
        filePath.startsWith('example/') ||
        filePath.startsWith('test/') ||
        (filePath.endsWith('.ts') && !filePath.endsWith('.d.ts'))
    ))
    assert.deepEqual(forbidden, [], 'no source files are packed')
})

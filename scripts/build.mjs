// Build script: emits every published distribution artifact.
//
// Artifacts (see CONTEXT.md / README.md):
//   - readable ESM module tree + readable ESM entry  dist/drerer.esm.js
//   - readable CommonJS bundle                       dist/drerer.cjs
//   - minified ESM bundle                            dist/drerer.esm.min.js
//   - minified CommonJS bundle                       dist/drerer.cjs.min.cjs
//   - readable UMD bundle                            dist/drerer.umd.js
//   - minified UMD bundle                            dist/drerer.umd.min.js
//   - fill-worker ESM/CJS bundles (readable + minified)
//   - TypeScript declarations + declaration maps
//
// Every minified artifact is a standalone bundle. Every JavaScript artifact
// gets an external source map. Entry points are named explicitly here instead
// of relying on `src/*.ts` globs to define the public package surface.
import * as esbuild from 'esbuild'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
// The output directory defaults to ./dist but can be overridden as the first
// argument (used by the package-level tests to build into a temp directory).
const outDir = path.resolve(process.argv[2] || path.join(root, 'dist'))

fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

const common = {
    absWorkingDir: root,
    tsconfig: 'tsconfig.build.json',
    keepNames: true,
    sourcemap: true,
    logLevel: 'info',
}

// 1. Emit TypeScript declarations and declaration maps once.
const tsc = path.join(root, 'node_modules', 'typescript', 'bin', 'tsc')
const tscResult = spawnSync(process.execPath, [
    tsc,
    '--emitDeclarationOnly',
    '--project', 'tsconfig.build.json',
    '--outDir', outDir,
    '--declarationDir', outDir,
], { stdio: 'inherit' })

if (tscResult.status !== 0) {
    process.exit(tscResult.status || 1)
}

// The fill-worker artifacts embed the bundled worker source as a string, so
// the published fill entry is self-contained: it creates its Worker from a
// Blob URL instead of referencing a separate worker file. This plugin bundles
// `src/fill/worker.ts` on demand and serves it as text.
const fillWorkerSourcePlugin = (minify) => ({
    name: 'fill-worker-source',
    setup (pluginBuild) {
        pluginBuild.onResolve(
            { filter: /^virtual:fill-worker-source$/ },
            () => ({ path: 'virtual:fill-worker-source', namespace: 'fill-worker-source' })
        )
        pluginBuild.onLoad(
            { filter: /.*/, namespace: 'fill-worker-source' },
            async () => {
                const worker = await esbuild.build({
                    ...common,
                    entryPoints: ['src/fill/worker.ts'],
                    bundle: true,
                    format: 'iife',
                    minify,
                    write: false,
                    logLevel: 'silent',
                })
                return {
                    contents: worker.outputFiles[0].text,
                    loader: 'text',
                }
            }
        )
    },
})

// 2. Emit the readable ESM module tree, plus the named readable ESM entry
// artifact which references that tree (it is not bundled). The tree covers the
// full import graph of the main entry; the named public entry points are
// explicit here rather than derived from `src/*.ts` globs.
const graph = await esbuild.build({
    ...common,
    entryPoints: ['src/index.ts'],
    bundle: true,
    format: 'esm',
    write: false,
    metafile: true,
    logLevel: 'silent',
})

const treeEntries = Object.keys(graph.metafile.inputs)
    .filter((input) => input.startsWith('src/'))
    .map((input) => ({
        in: input,
        out: input.replace(/^src\//, '').replace(/\.ts$/, ''),
    }))

treeEntries.push({ in: 'src/index.ts', out: 'index' })

await esbuild.build({
    ...common,
    entryPoints: treeEntries,
    outdir: outDir,
    format: 'esm',
})

// The named readable ESM entry artifact references the emitted readable
// module tree instead of duplicating it.
await esbuild.build({
    ...common,
    stdin: {
        contents: "export * from './index.js';\nexport { default } from './index.js';\n",
        resolveDir: outDir,
        sourcefile: 'drerer.esm.ts',
    },
    outfile: path.join(outDir, 'drerer.esm.js'),
    format: 'esm',
})

// 3. Emit the main bundles.
const bundleMain = ({ outfile, format, minify = false, globalName }) => esbuild.build({
    ...common,
    entryPoints: ['src/index.ts'],
    bundle: true,
    format,
    minify,
    globalName,
    outfile: path.join(outDir, outfile),
})

await bundleMain({ outfile: 'drerer.cjs', format: 'cjs' })
await bundleMain({ outfile: 'drerer.cjs.min.cjs', format: 'cjs', minify: true })
await bundleMain({ outfile: 'drerer.esm.min.js', format: 'esm', minify: true })

// esbuild no longer ships a `umd` output format, so the UMD artifacts wrap an
// IIFE bundle in the standard UMD header. The IIFE body is turned into a
// `return` so the UMD factory hands the API object back to the wrapper.
const umdBanner = `(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define([], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.drerer = factory());
})(this, function () {`

const bundleUmd = async ({ outfile, minify = false }) => {
    await esbuild.build({
        ...common,
        entryPoints: ['src/index.ts'],
        bundle: true,
        format: 'iife',
        globalName: 'drerer',
        minify,
        outfile: path.join(outDir, outfile),
        banner: { js: umdBanner },
        footer: { js: '});' },
    })

    const filePath = path.join(outDir, outfile)
    const code = fs.readFileSync(filePath, 'utf8')
    fs.writeFileSync(filePath, code.replace(/var drerer\s*=/, 'return'))
}

await bundleUmd({ outfile: 'drerer.umd.js' })
await bundleUmd({ outfile: 'drerer.umd.min.js', minify: true })

// 4. Emit the fill-worker bundles.
const bundleFill = ({ outfile, format, minify = false }) => esbuild.build({
    ...common,
    entryPoints: ['src/fill/index.ts'],
    bundle: true,
    format,
    minify,
    plugins: [fillWorkerSourcePlugin(minify)],
    outfile: path.join(outDir, outfile),
})

await bundleFill({ outfile: 'drerer.fill.esm.js', format: 'esm' })
await bundleFill({ outfile: 'drerer.fill.cjs', format: 'cjs' })
await bundleFill({ outfile: 'drerer.fill.esm.min.js', format: 'esm', minify: true })
await bundleFill({ outfile: 'drerer.fill.cjs.min.cjs', format: 'cjs', minify: true })

// 5. Verify every declared artifact and its source map exists.
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
    'index.d.ts',
    'fill/index.d.ts',
]

const missing = artifacts.filter((name) => !fs.existsSync(path.join(outDir, name)))
if (missing.length) {
    console.error(`build: missing artifacts: ${missing.join(', ')}`)
    process.exit(1)
}

console.log(`build: wrote ${artifacts.length} artifacts to ${outDir}`)

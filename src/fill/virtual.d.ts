// Build-time virtual module. The build script bundles `src/fill/worker.ts`
// and serves its source as text (see `scripts/build.mjs`).
declare module 'virtual:fill-worker-source' {
    const workerSource:string
    export default workerSource
}

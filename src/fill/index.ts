// The worker source is bundled at build time and embedded as a string, so
// every published fill artifact is self-contained: the worker is created
// from a Blob URL instead of referencing a separate worker file.
import workerSource from 'virtual:fill-worker-source'

export default class FillWorker extends Worker {
    constructor () {
        const blob = new Blob([workerSource], { type:'text/javascript' })
        super(URL.createObjectURL(blob))
    }
}

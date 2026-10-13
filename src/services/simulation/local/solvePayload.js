import { MusicBox } from '@ncar/music-box'

// Solves a MusicBox.toJson() payload in a Web Worker (see solver.worker.js), so the UI stays
// responsive during a long simulation. One worker serves the whole session, so the WASM module
// loads only once. Where Worker does not exist (tests, older environments), the solver runs on
// the main thread as before.

let worker = null
let nextId = 0
const pending = new Map() // id -> { resolve, reject }

function rejectAll(error) {
  pending.forEach(({ reject }) => reject(error))
  pending.clear()
}

function getWorker() {
  if (worker) return worker
  worker = new Worker(new URL('./solver.worker.js', import.meta.url), { type: 'module' })
  worker.onmessage = ({ data }) => {
    const request = pending.get(data.id)
    if (!request) return
    pending.delete(data.id)
    if (data.error) request.reject(new Error(data.error.message))
    else request.resolve(data.result)
  }
  // A worker that fails to load or crashes cannot answer; the next run starts a new one.
  worker.onerror = (event) => {
    event.preventDefault?.()
    worker.terminate()
    worker = null
    rejectAll(new Error(event.message || 'The solver could not run.'))
  }
  return worker
}

export function solvePayload(payload) {
  if (typeof Worker === 'undefined') {
    return MusicBox.fromJson(payload).solve()
  }
  return new Promise((resolve, reject) => {
    const id = ++nextId
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, payload })
  })
}

// For tests: forget the worker, so the next call starts a new one.
export function resetSolverWorker() {
  worker?.terminate()
  worker = null
  pending.clear()
}

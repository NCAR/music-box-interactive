import { describe, it, expect, vi, afterEach } from 'vitest'
import { resetSolverWorker, solvePayload } from '../src/services/simulation/local/solvePayload'

// jsdom has no Worker, so these tests give it a fake one that answers like solver.worker.js.
class FakeWorker {
  static instances = []
  constructor(url, options) {
    this.url = String(url)
    this.options = options
    this.messages = []
    this.terminated = false
    FakeWorker.instances.push(this)
  }
  postMessage(message) {
    this.messages.push(message)
  }
  terminate() {
    this.terminated = true
  }
  // Test helpers: answer as the worker would.
  answer(data) {
    this.onmessage({ data })
  }
  crash(message) {
    this.onerror({ message, preventDefault: () => {} })
  }
}

afterEach(() => {
  resetSolverWorker()
  FakeWorker.instances = []
  vi.unstubAllGlobals()
})

describe('solvePayload', () => {
  it('solves in a module worker and returns its result', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const promise = solvePayload({ mechanism: 'm' })

    const [worker] = FakeWorker.instances
    expect(worker.url).toMatch(/solver\.worker\.js/)
    expect(worker.options).toEqual({ type: 'module' })
    const [{ id, payload }] = worker.messages
    expect(payload).toEqual({ mechanism: 'm' })

    worker.answer({ id, result: { columns: ['time.s'], height: 1, data: { 'time.s': [0] } } })
    await expect(promise).resolves.toEqual({ columns: ['time.s'], height: 1, data: { 'time.s': [0] } })
  })

  it('keeps one worker for several runs, and matches each answer to its run', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const first = solvePayload({ n: 1 })
    const second = solvePayload({ n: 2 })
    expect(FakeWorker.instances).toHaveLength(1)

    const [worker] = FakeWorker.instances
    const [a, b] = worker.messages
    worker.answer({ id: b.id, result: 'second' })
    worker.answer({ id: a.id, result: 'first' })
    await expect(first).resolves.toBe('first')
    await expect(second).resolves.toBe('second')
  })

  it('rejects with the solver error', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const promise = solvePayload({})
    const [worker] = FakeWorker.instances
    worker.answer({ id: worker.messages[0].id, error: { message: 'Solver failed to converge' } })
    await expect(promise).rejects.toThrow('Solver failed to converge')
  })

  it('rejects the open runs when the worker crashes, and starts a new worker next time', async () => {
    vi.stubGlobal('Worker', FakeWorker)
    const promise = solvePayload({})
    FakeWorker.instances[0].crash('out of memory')
    await expect(promise).rejects.toThrow('out of memory')
    expect(FakeWorker.instances[0].terminated).toBe(true)

    solvePayload({})
    expect(FakeWorker.instances).toHaveLength(2)
  })
})

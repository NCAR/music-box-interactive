import { describe, it, expect, vi } from 'vitest'
import { createNotify } from '../src/lib/notify'

describe('toast conventions', () => {
  const setup = () => {
    const toast = vi.fn()
    return { toast, notify: createNotify(toast) }
  }

  it('reports rejected input in red with a fixed title', () => {
    const { toast, notify } = setup()
    notify.invalidInput('Pressure must be a valid number.')
    expect(toast).toHaveBeenCalledWith({
      title: 'Invalid Input',
      description: 'Pressure must be a valid number.',
      variant: 'destructive',
    })
  })

  it('reports other failures in red with their own title', () => {
    const { toast, notify } = setup()
    notify.error('Simulation Failed', 'Solver error.')
    expect(toast).toHaveBeenCalledWith({
      title: 'Simulation Failed',
      description: 'Solver error.',
      variant: 'destructive',
    })
  })

  it('shows confirmations in green and neutral notices in the default blue', () => {
    const { toast, notify } = setup()
    notify.success('Time Point Added', 'Added time point at t=5s.')
    notify.info('Started Fresh', 'Add species in the Mechanism section.')
    expect(toast.mock.calls.map(([arg]) => arg.variant)).toEqual(['success', undefined])
  })

  it('uses the warning and delete styles only for their own purpose', () => {
    const { toast, notify } = setup()
    notify.warning('Selection Limited', 'Selected the first 50.')
    notify.removed('Species Removed', '"O3" was removed from the mechanism.')
    expect(toast.mock.calls.map(([arg]) => arg.variant)).toEqual(['warning', 'delete'])
  })
})

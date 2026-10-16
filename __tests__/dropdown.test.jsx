import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

import { Dropdown } from '../src/components/ui/dropdown'

// Native <select> menus have limited styling support. Render the menu as
// ordinary DOM to control the surface, shadow, hover state, and tick marks.

const OPTIONS = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma', disabled: true, title: 'not available' },
]

const openOptions = () => [...document.querySelectorAll('[role="option"]')]

describe('Dropdown', () => {
  it('is closed until clicked, and shows the selected label', () => {
    render(<Dropdown value="b" options={OPTIONS} onChange={() => {}} />)
    expect(openOptions()).toHaveLength(0)
    expect(screen.getByRole('button')).toHaveTextContent('Beta')
  })
  
  it('opens, marks the selected option, and reports the choice', () => {
    const onChange = vi.fn()
    render(<Dropdown value="b" options={OPTIONS} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Beta/ }))
  
    const options = openOptions()
    expect(options.map((o) => o.textContent)).toEqual(['Alpha', 'Beta', 'Gamma'])
    expect(options[1]).toHaveAttribute('aria-selected', 'true')
    expect(options[0]).toHaveAttribute('aria-selected', 'false')
  
    fireEvent.click(options[0])
    expect(onChange).toHaveBeenCalledWith('a')
    expect(openOptions()).toHaveLength(0)  // closes on pick
  })
  
  it('honours disabled options', () => {
    const onChange = vi.fn()
    render(<Dropdown value="a" options={OPTIONS} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /Alpha/ }))
  
    const gamma = openOptions()[2]
    expect(gamma).toBeDisabled()
    expect(gamma).toHaveAttribute('title', 'not available')
    fireEvent.click(gamma)
    expect(onChange).not.toHaveBeenCalled()
  })
  
  it('closes on an outside click', () => {
    render(
      <div>
        <Dropdown value="a" options={OPTIONS} onChange={() => {}} />
        <button type="button">outside</button>
      </div>
    )
    fireEvent.click(screen.getByRole('button', { name: /Alpha/ }))
    expect(openOptions()).toHaveLength(3)
  
    fireEvent.mouseDown(screen.getByRole('button', { name: 'outside' }))
    expect(openOptions()).toHaveLength(0)
  })
  
  it('falls back to a placeholder when nothing matches the value', () => {
    render(<Dropdown value="zzz" options={OPTIONS} onChange={() => {}} placeholder="Pick one" />)
    expect(screen.getByRole('button')).toHaveTextContent('Pick one')
  })
})

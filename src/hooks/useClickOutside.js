import { useEffect } from 'react'

// Calls onOutsideClick when mousedown occurs outside the element.
// Only attaches the listener when active (e.g., when a dropdown is open).
export function useClickOutside(ref, onOutsideClick, active = true) {
  useEffect(() => {
    if (!active) return

    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onOutsideClick()
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [ref, onOutsideClick, active])
}

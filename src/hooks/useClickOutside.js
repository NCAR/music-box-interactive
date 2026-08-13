import { useEffect } from 'react'

// Calls onOutsideClick when a mousedown happens outside the element ref points to.
// Pass `active` to only attach the listener while something (a dropdown) is open.
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

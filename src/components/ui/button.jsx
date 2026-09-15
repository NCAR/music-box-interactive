import * as React from 'react'
import { cn } from '../../lib/utils'

// Three roles cover every action in the app: primary (the main action), secondary
// (a neutral supporting action), and destructive (removes or clears something).
// `ghost` stays only as an unstyled base for custom-styled elements like tab selectors.
const Button = React.forwardRef(
  ({ className, variant = 'primary', size = 'default', ...props }, ref) => {
    const variants = {
      primary:
        'bg-white border-2 border-action text-action font-semibold hover:bg-action hover:text-white',
      secondary: 'bg-white border border-border text-ink font-medium hover:bg-surface-alt',
      destructive: 'bg-white border border-danger text-danger font-medium hover:bg-caution',
      ghost: 'text-ink hover:bg-surface-hover transition-colors duration-200',
    }

    const sizes = {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 px-3',
      lg: 'h-11 px-8',
      icon: 'h-10 w-10',
    }

    return (
      <button
        className={cn(
          'inline-flex items-center justify-center rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:pointer-events-none disabled:opacity-50',
          variants[variant],
          sizes[size],
          className
        )}
        ref={ref}
        {...props}
      >
        {props.children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button }

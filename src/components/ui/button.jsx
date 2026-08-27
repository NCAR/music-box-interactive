import * as React from 'react'
import { cn } from '../../lib/utils'

const Button = React.forwardRef(
  ({ className, variant = 'glass', size = 'default', ...props }, ref) => {
    const variants = {
      action:
        'bg-action text-white hover:bg-action-hover shadow-sm transition-colors duration-200 rounded-full',
      outline:
        'border border-border bg-transparent text-ink hover:bg-surface-hover transition-colors duration-200',
      ghost: 'text-ink hover:bg-surface-hover transition-colors duration-200',
      link: 'text-action underline-offset-4 hover:underline',
      glass:
        'bg-surface-alt border border-border text-ink hover:bg-surface-hover transition-colors duration-200',
      destructive:
        'bg-danger text-white hover:bg-danger-hover shadow-sm transition-colors duration-200',
      assist:
        'bg-assist text-assist-foreground hover:bg-assist-hover font-bold shadow-sm hover:shadow transition-colors duration-200 rounded-full',
      // `antialiased` matters here: light text on a dark fill gets visibly thickened by
      // subpixel rendering, so grayscale smoothing keeps the label crisp.
      assistSecondary:
        'bg-assist-secondary text-assist-secondary-foreground hover:bg-assist-secondary-hover font-bold antialiased tracking-wide shadow-sm hover:shadow transition-colors duration-200 rounded-full focus-visible:ring-assist-secondary',
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
          'inline-flex items-center justify-center rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action disabled:pointer-events-none disabled:opacity-50',
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

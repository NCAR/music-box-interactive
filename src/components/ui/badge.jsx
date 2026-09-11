import * as React from 'react'
import { cn } from '../../lib/utils'

const Badge = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-[#0057C2]/20 backdrop-blur-lg border border-[#0057C2]/40 text-action',
    success: 'bg-green-500/20 backdrop-blur-lg border border-green-400/40 text-green-700',
    warning: 'bg-orange-500/20 backdrop-blur-lg border border-orange-400/40 text-orange-700',
    error: 'bg-red-500/20 backdrop-blur-lg border border-red-400/40 text-red-700',
    outline: 'backdrop-blur-lg border border-border text-ink',
    secondary: 'bg-surface-alt backdrop-blur-lg border border-border text-ink',
    idle: 'bg-black/5 backdrop-blur-lg border border-border text-muted',
    running: 'bg-[#0057C2]/20 backdrop-blur-lg border border-[#0057C2]/40 text-action',
    succeeded: 'bg-green-500/20 backdrop-blur-lg border border-green-400/40 text-green-700',
    failed: 'bg-red-500/20 backdrop-blur-lg border border-red-400/40 text-red-700',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-all duration-300',
        variants[variant],
        className
      )}
      ref={ref}
      {...props}
    />
  )
})

Badge.displayName = 'Badge'

export { Badge }

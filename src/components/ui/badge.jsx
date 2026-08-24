import * as React from 'react'
import { cn } from '../../lib/utils'

const Badge = React.forwardRef(({ className, variant = 'default', ...props }, ref) => {
  const variants = {
    default: 'bg-blue-500/20 backdrop-blur-lg border border-blue-400/40 text-blue-700',
    success: 'bg-green-500/20 backdrop-blur-lg border border-green-400/40 text-green-700',
    warning: 'bg-orange-500/20 backdrop-blur-lg border border-orange-400/40 text-orange-700',
    error: 'bg-red-500/20 backdrop-blur-lg border border-red-400/40 text-red-700',
    outline: 'bg-white/0 backdrop-blur-lg border border-white/20 text-gray-700',
    secondary: 'bg-white/10 backdrop-blur-lg border border-white/20 text-gray-700',
    idle: 'bg-gray-500/20 backdrop-blur-lg border border-gray-400/40 text-gray-700',
    running: 'bg-blue-500/20 backdrop-blur-lg border border-blue-400/40 text-blue-700',
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

import { useMemo } from 'react'
import { useToast } from '@/hooks/use-toast'
import { createNotify } from '../lib/notify'

// Toast helpers that follow the project's notification conventions (see lib/notify.js).
export function useNotify() {
  const { toast } = useToast()
  return useMemo(() => createNotify(toast), [toast])
}

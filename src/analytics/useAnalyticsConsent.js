import { useSyncExternalStore } from 'react'
import { readConsent, setConsent, subscribeConsent } from './consent'

// The analytics choice ('granted', 'denied' or null) and the function that changes it.
export function useAnalyticsConsent() {
  const consent = useSyncExternalStore(subscribeConsent, readConsent)
  return [consent, setConsent]
}

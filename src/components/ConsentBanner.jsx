import { Button } from './ui/button'
import { analyticsAvailable, PRIVACY_NOTICE_URL } from '../analytics/consent'
import { useAnalyticsConsent } from '../analytics/useAnalyticsConsent'

// Asks the user to accept or decline Google Analytics. The banner shows until the user makes a
// choice. The two buttons have the same style, so neither choice is easier than the other.
export function ConsentBanner() {
  const [consent, setConsent] = useAnalyticsConsent()
  if (!analyticsAvailable() || consent !== null) return null

  return (
    <div
      role="region"
      aria-label="Analytics consent"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4 lg:left-64"
    >
      <div className="mx-auto max-w-3xl rounded-lg border border-border bg-surface p-4 text-sm text-ink shadow-lg sm:flex sm:items-center sm:gap-4">
        <p className="flex-1">
          We use Google Analytics to count visits and simulation runs. Google Analytics sets cookies
          and sends your IP address and browser data to Google. We load it only if you accept. You
          can change your choice in Settings.{' '}
          <a
            href={PRIVACY_NOTICE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-action underline hover:text-action-hover"
          >
            Privacy notice
          </a>
        </p>
        <div className="mt-3 flex gap-2 sm:mt-0 sm:flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={() => setConsent('denied')}>
            Decline
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setConsent('granted')}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ConsentBanner

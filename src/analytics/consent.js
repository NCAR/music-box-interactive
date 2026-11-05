// Consent for Google Analytics. The app loads Google Analytics only after the user accepts it.
// The choice ('granted' or 'denied') is saved in localStorage. Without a saved choice, the
// consent banner asks the user. Builds without VITE_GA_ID have no analytics and do not ask.

export const ANALYTICS_CONSENT_KEY = 'musicbox.analyticsConsent'
export const PRIVACY_NOTICE_URL = 'https://www.ucar.edu/privacy-notice'
export const COOKIE_NOTICE_URL = 'https://www.ucar.edu/cookie-other-tracking-technologies-notice'
export const PRIVACY_EMAIL = 'privacy@ucar.edu'

const CHOICES = ['granted', 'denied']

export const GA_ID = import.meta.env.VITE_GA_ID || ''
export const analyticsAvailable = () => Boolean(GA_ID)

const listeners = new Set()
let loaded = false
// The choice for this page. It is the fallback when storage is blocked.
let pageChoice = null

export function readConsent() {
  try {
    const stored = window.localStorage.getItem(ANALYTICS_CONSENT_KEY)
    return CHOICES.includes(stored) ? stored : pageChoice
  } catch {
    return pageChoice
  }
}

// Adds the Google tag to the page. Each page load adds it one time only.
function loadGoogleAnalytics(id) {
  window[`ga-disable-${id}`] = false
  if (loaded) return
  loaded = true
  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    // The Google tag requires the arguments object, not an array.
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', id)
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`
  document.head.appendChild(script)
}

// Stops the Google tag and removes its cookies. Google sets the cookies on the highest domain
// that it can, so the function removes them from each parent domain of the host.
function stopGoogleAnalytics(id) {
  window[`ga-disable-${id}`] = true
  const names = document.cookie
    .split(';')
    .map((cookie) => cookie.split('=')[0].trim())
    .filter((name) => name === '_ga' || name.startsWith('_ga_'))
  const parts = window.location.hostname.split('.')
  const domains = parts.map((_part, index) => parts.slice(index).join('.'))
  for (const name of names) {
    const expired = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
    document.cookie = expired
    for (const domain of domains) document.cookie = `${expired}; domain=${domain}`
  }
}

function applyConsent(choice) {
  if (!GA_ID) return
  if (choice === 'granted') loadGoogleAnalytics(GA_ID)
  else stopGoogleAnalytics(GA_ID)
}

// Loads Google Analytics when the user accepted it on an earlier visit.
export function initAnalytics() {
  if (readConsent() === 'granted') applyConsent('granted')
}

export function setConsent(choice) {
  if (!CHOICES.includes(choice)) return
  pageChoice = choice
  try {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, choice)
  } catch {
    // Storage can be blocked (private windows). The choice then lasts for this page only.
  }
  applyConsent(choice)
  listeners.forEach((listener) => listener(choice))
}

// Calls `listener` when the choice changes. Returns the function that stops it.
export function subscribeConsent(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

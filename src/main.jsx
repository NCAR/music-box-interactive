import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './theme/ThemeProvider'
import { RateParameterUnitProvider } from './hooks/RateParameterUnitProvider'

// After a new deploy, an open tab can still ask for old hashed chunks that the server no longer has.
// Reload to get the current index.html and chunk names. Do not reload again within 10 seconds.
window.addEventListener('vite:preloadError', (event) => {
  const key = 'preload-error-reload-at'
  try {
    const last = Number(sessionStorage.getItem(key))
    if (last && Date.now() - last < 10000) return
    sessionStorage.setItem(key, String(Date.now()))
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <RateParameterUnitProvider>
          <App />
        </RateParameterUnitProvider>
      </ThemeProvider>
    </Provider>
  </StrictMode>
)

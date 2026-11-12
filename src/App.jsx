import MusicBoxAppNew from './components/pages/MusicBoxAppNew'
import { Toaster } from './components/ui/toaster'
import { ConsentBanner } from './components/ConsentBanner'

/**
 * Main App Component
 * The app is the whole product now -- there is no separate landing page.
 */
function App() {
  return (
    <>
      <MusicBoxAppNew />
      <Toaster />
      <ConsentBanner />
    </>
  )
}

export default App

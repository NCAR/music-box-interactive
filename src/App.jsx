import MusicBoxAppNew from './components/pages/MusicBoxAppNew'
import { Toaster } from './components/ui/toaster'

/**
 * Main App Component
 * The app is the whole product now -- there is no separate landing page.
 */
function App() {
  return (
    <>
      <MusicBoxAppNew />
      <Toaster />
    </>
  )
}

export default App

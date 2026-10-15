import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './redux/store'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './theme/ThemeProvider'
import { RateParameterUnitProvider } from './hooks/RateParameterUnitProvider'

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

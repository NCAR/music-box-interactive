import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { useEffect } from 'react'
import Navigation from '../Navigation'
import DashboardPage from './DashboardPage'
import MechanismPage from './MechanismPage'
import ConditionsPage from './ConditionsPage'
import PlotsPage from './PlotsPage'
import AboutPage from './AboutPage'
import ContactPage from './ContactPage'
import { resetMechanism } from '../../redux/slices/mechanismSlice'
import { resetConditions } from '../../redux/slices/conditionsSlice'
import { resetSimulation } from '../../redux/slices/simulationSlice'

/**
 * AppContent Component
 * Resets simulation state and lands on the Dashboard when the app first loads.
 */
function AppContent() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  // Always start with a fresh state on load.
  useEffect(() => {
    dispatch(resetMechanism())
    dispatch(resetConditions())
    dispatch(resetSimulation())
    navigate('/', { replace: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Client-side navigation preserves scroll position; reset it so each route starts at the top.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-surface relative">
      {/* Responsive sidebar navigation */}
      <Navigation />

      {/* Main content area with responsive left margin for sidebar */}
      <div className="min-h-screen relative z-10 lg:ml-64 transition-all duration-300">
        {/* Responsive container with proper padding for mobile */}
        <div className="max-w-7xl mx-auto px-2 xs:px-3 sm:px-6 lg:px-8 py-3 xs:py-4 sm:py-6 lg:py-8 pt-14 xs:pt-16 lg:pt-6">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/mechanism" element={<MechanismPage />} />
            <Route path="/conditions" element={<ConditionsPage />} />
            <Route path="/plots" element={<PlotsPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

/**
 * MusicBoxAppNew Component
 * Main application with Redux-powered features
 */
function MusicBoxAppNew() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default MusicBoxAppNew

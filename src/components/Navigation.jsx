/* global __APP_VERSION__ */
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Atom, Settings, BarChart3, Info, Bug, MessagesSquare } from 'lucide-react'
import RunSimulationButton from './RunSimulationButton'
import DownloadButtons from './DownloadButtons'

/**
 * Navigation Component
 * Responsive sidebar navigation with mobile hamburger menu
 */
export function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const navLinks = [
    { to: '/', label: 'Dashboard', Icon: Home },
    { to: '/mechanism', label: 'Mechanism', Icon: Atom },
    { to: '/conditions', label: 'Conditions', Icon: Settings },
    { to: '/plots', label: 'Results', Icon: BarChart3 },
  ]

  const infoLinks = [{ to: '/about', label: 'About', Icon: Info }]

  const communityLinks = [
    {
      href: 'https://github.com/NCAR/music-box-interactive/discussions',
      label: 'Start a Discussion',
      Icon: MessagesSquare,
    },
    {
      href: 'https://github.com/NCAR/music-box-interactive/issues/new',
      label: 'Report a Bug',
      Icon: Bug,
    },
  ]

  const navLinkClassName = ({ isActive }) =>
    `flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 font-medium text-sm sm:text-base border-l-4 transition-all duration-300 ${
      isActive
        ? 'border-location text-location-foreground font-semibold'
        : 'border-transparent text-ink hover:bg-surface-hover'
    }`

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <>
      {/* Mobile Hamburger/Close Button with Animation and Position Transition */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className={`lg:hidden fixed z-50 p-2 rounded-lg bg-surface border border-border text-ink shadow-sm opacity-90 hover:opacity-100 transition-all duration-300 ${
          isMobileMenuOpen
            ? 'top-4 left-[200px] xs:left-[216px] sm:left-[232px] md:left-[240px]'
            : 'top-4 left-4'
        }`}
        aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
      >
        {/* Animated Hamburger Icon */}
        <div className="w-4 h-4 flex flex-col justify-center items-center relative">
          {/* Top Line */}
          <span
            className={`block w-4 h-0.5 bg-ink rounded-full transition-all duration-400 ease-in-out absolute ${
              isMobileMenuOpen ? 'rotate-45' : '-translate-y-2'
            }`}
          ></span>
          {/* Middle Line */}
          <span
            className={`block w-4 h-0.5 bg-ink rounded-full transition-all duration-300 ease-in-out absolute ${
              isMobileMenuOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'
            }`}
          ></span>
          {/* Bottom Line */}
          <span
            className={`block w-4 h-0.5 bg-ink rounded-full transition-all duration-400 ease-in-out absolute ${
              isMobileMenuOpen ? '-rotate-45' : 'translate-y-2'
            }`}
          ></span>
        </div>
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={closeMobileMenu} />
      )}

      {/* Sidebar Navigation */}
      <nav
        className={`
        fixed left-0 top-0 h-screen bg-surface text-ink border-r border-border shadow-sm flex flex-col z-40
        w-[240px] xs:w-[256px] sm:w-[272px] md:w-[280px] lg:w-64
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
      >
        {/* Logo Section */}
        <div className="p-4 sm:p-5 md:p-6 border-b border-border">
          <h1 className="text-base sm:text-lg md:text-xl font-bold text-heading text-right [font-variant:small-caps]">
            Music Box Interactive
          </h1>
          <p className="text-xs text-muted text-right mt-0.5">v{__APP_VERSION__}</p>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 py-4 sm:py-5 md:py-6 px-3 sm:px-4 space-y-2 overflow-y-auto">
          {navLinks.slice(0, 3).map((link) => {
            const IconComponent = link.Icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={closeMobileMenu}
                className={navLinkClassName}
              >
                <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                <span className="truncate">{link.label}</span>
              </NavLink>
            )
          })}

          {/* Separator Line */}
          <div className="border-t border-border my-3 sm:my-4"></div>

          {/* Run Simulation Button */}
          <div className="px-1 sm:px-2 space-y-2">
            <RunSimulationButton className="w-full px-2 text-sm sm:text-base whitespace-nowrap" />
            <DownloadButtons />
          </div>

          {/* Separator Line */}
          <div className="border-t border-border my-3 sm:my-4"></div>

          {/* Results Link */}
          {navLinks.slice(3).map((link) => {
            const IconComponent = link.Icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={closeMobileMenu}
                className={navLinkClassName}
              >
                <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                <span className="truncate">{link.label}</span>
              </NavLink>
            )
          })}
        </div>

        {/* About / Community */}
        <div className="px-3 sm:px-4 py-2 space-y-2 border-t border-border">
          {infoLinks.map((link) => {
            const IconComponent = link.Icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={closeMobileMenu}
                className={navLinkClassName}
              >
                <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                <span className="truncate">{link.label}</span>
              </NavLink>
            )
          })}
          {communityLinks.map((link) => {
            const IconComponent = link.Icon
            return (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={navLinkClassName({ isActive: false })}
              >
                <IconComponent className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0" />
                <span className="truncate">{link.label}</span>
              </a>
            )
          })}
        </div>

        {/* ACOM Logo */}
        <div className="border-t border-border">
          <div className="p-3 sm:p-4">
            <img
              src="/logos/ACOM-color-vertical.png"
              alt="ACOM Laboratory"
              className="h-16 sm:h-20 w-auto mx-auto"
            />
          </div>
          <img
            src="/waves/NCAR-waves-narrow-fill.png"
            alt=""
            aria-hidden="true"
            className="w-full h-14 sm:h-16 object-cover object-top pointer-events-none"
          />
        </div>
      </nav>
    </>
  )
}

export default Navigation

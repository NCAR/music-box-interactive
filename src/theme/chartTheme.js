import { useTheme } from './themeContext'

// Colors for the Recharts plots. Recharts writes them as SVG attributes, which cannot use the
// CSS variables, so the plots read them here. The light values are the colors that the plots
// always used.
const LIGHT = {
  grid: '#D8D6D2',
  axis: '#5f6368',
  label: '#1f2937',
  text: '#1f2937',
  primary: '#0057C2', // NCAR Blue
}

const DARK = {
  grid: '#3d3d3d',
  axis: '#b3b3b3',
  label: '#e5e7eb',
  text: '#e5e7eb',
  primary: '#42C0FF', // NCAR Light Blue: NCAR Blue is too dark on a dark surface
}

export const chartThemeFor = (theme) => (theme === 'dark' ? DARK : LIGHT)

export const useChartTheme = () => chartThemeFor(useTheme().theme)

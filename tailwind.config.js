import defaultTheme from 'tailwindcss/defaultTheme'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'Helvetica', 'Arial', ...defaultTheme.fontFamily.sans],
        mono: ['Poppins', ...defaultTheme.fontFamily.mono],
      },
      screens: {
        'xs': '475px',
        '3xl': '1920px',
      },
      maxWidth: {
        '8xl': '88rem',
        '9xl': '96rem',
      },
      colors: {
        action: 'var(--color-action)',
        'action-hover': 'var(--color-action-hover)',
        location: 'var(--color-location)',
        'location-foreground': 'var(--color-location-foreground)',
        assist: 'var(--color-assist)',
        'assist-hover': 'var(--color-assist-hover)',
        'assist-foreground': 'var(--color-assist-foreground)',
        'assist-secondary': 'var(--color-assist-secondary)',
        'assist-secondary-hover': 'var(--color-assist-secondary-hover)',
        'assist-secondary-foreground': 'var(--color-assist-secondary-foreground)',
        'assist-secondary-border': 'var(--color-assist-secondary-border)',
        'assist-secondary-ring': 'var(--color-assist-secondary-ring)',
        surface: 'var(--color-surface)',
        'surface-alt': 'var(--color-surface-alt)',
        'surface-hover': 'var(--color-surface-hover)',
        border: 'var(--color-border)',
        heading: 'var(--color-heading)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
        danger: 'var(--color-danger)',
        'danger-hover': 'var(--color-danger-hover)',
        caution: 'var(--color-caution)',
      },
    },
  },
  plugins: [],
}

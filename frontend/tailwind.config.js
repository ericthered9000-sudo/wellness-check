/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Map existing CSS variables to Tailwind colors
        primary: {
          DEFAULT: '#2563eb',
          dark: '#1d4ed8',
        },
        secondary: '#10b981',
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
        surface: '#ffffff',
        card: '#ffffff',
        border: '#e2e8f0',
        muted: '#64748b',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'sans-serif'],
      },
      fontSize: {
        // Senior-friendly sizes
        'xs': ['0.875rem', { lineHeight: '1.5' }],  // 14px
        'base': ['1rem', { lineHeight: '1.6' }],    // 16px
        'lg': ['1.125rem', { lineHeight: '1.6' }],  // 18px
        'xl': ['1.5rem', { lineHeight: '1.4' }],    // 24px
        'score': ['4.5rem', { lineHeight: '1' }],   // 72px
      },
      spacing: {
        // Touch target minimum
        'touch': '44px',
      },
      borderRadius: {
        DEFAULT: '12px',
        'lg': '16px',
      },
      boxShadow: {
        DEFAULT: '0 2px 8px rgba(0,0,0,0.08)',
        'lg': '0 4px 12px rgba(0,0,0,0.12)',
      },
      zIndex: {
        'dropdown': '100',
        'sticky': '200',
        'fixed': '300',
        'ad-banner': '400',
        'bottom-nav': '500',
        'modal-backdrop': '900',
        'modal': '1000',
        'popover': '1100',
        'emergency': '1150',
        'tooltip': '1200',
      },
      maxWidth: {
        'app': '600px',
      },
    },
  },
  plugins: [],
}
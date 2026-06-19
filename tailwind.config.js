/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#e4ebe0',       // page background — light sage green
          card: '#ffffff',     // card background — white
          border: '#d0dbc8',   // borders — light sage
          hover: '#f0f6ec',    // hover states — very light sage
        },
        brand: {
          primary: '#4d7a3e',  // olive green (replaces cyan)
          accent: '#3a5e2e',   // darker olive
          success: '#2d7a29',  // green
          warning: '#d97706',  // amber
          danger: '#dc2626',   // red
          info: '#4a6fa1',     // blue
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        }
      }
    },
  },
  plugins: [],
}

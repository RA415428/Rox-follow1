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
        instagram: {
          pink: '#E1306C',
          purple: '#833AB4',
          orange: '#F56040',
          yellow: '#FCAF45',
          gold: '#FFD700',
        },
        dark: {
          bg: '#0F172A',
          card: '#1E293B',
          border: '#334155'
        }
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"PingFang SC"', '"Microsoft YaHei"', 'system-ui', 'sans-serif']
      },
      colors: {
        bg: '#0f1115',
        panel: '#161a22',
        panel2: '#1e2330',
        border: '#2a3142',
        ink: '#e6e9ef',
        ink2: '#a3a9b8',
        accent: '#f5c451',
        accent2: '#74e1c1'
      }
    }
  },
  plugins: []
}

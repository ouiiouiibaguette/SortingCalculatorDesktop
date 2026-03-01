/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary": "#00A099",
        "background-light": "#f8fafc", /* slightly off-white */
        "background-dark": "#050505",
        "neon-accent": "#00A099",
        "neon-orange": "#333333",
        "surface-light": "#ffffff",
        "surface-dark": "#111111",
      },
      fontFamily: {
        "display": ["Inter", "sans-serif"],
        "mono": ["monospace"]
      },
      boxShadow: {
        "neon": "0 0 10px rgba(0, 160, 153, 0.5), 0 0 20px rgba(0, 160, 153, 0.3)",
        "neon-orange": "0 0 15px rgba(255, 107, 0, 0.6)",
      }
    },
  },
  plugins: [],
}

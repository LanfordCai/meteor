module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'metamask-orange': '#e57330',
        'flow-green': '#00ee8a',
      },
      fontFamily: {
        'flow': ['acumin-pro', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

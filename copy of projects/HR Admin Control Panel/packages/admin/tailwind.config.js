/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          'deep-brown': '#473C31',
          'warm-brown': '#5f4b3c',
          taupe: '#bd9979',
          gold: '#d4a04a',
          bronze: '#C4721C',
          'off-white': '#F9F8F6',
          cream: '#f9f6f2',
          'light-gray': '#d7d1ca',
          border: '#E8E4DF',
          'text-dark': '#25282a',
          'text-brown': '#3d3228',
        },
      },
      fontFamily: {
        sans: ['"Avenir Next"', 'Avenir', '"Segoe UI"', 'system-ui', 'sans-serif'],
        serif: ['"Noto Serif"', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};

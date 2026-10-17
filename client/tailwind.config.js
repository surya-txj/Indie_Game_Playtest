/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#effaf3', 100: '#d8f3e1', 500: '#2f9e5b', 600: '#23824a', 700: '#1d683d' },
      },
    },
  },
  plugins: [],
};

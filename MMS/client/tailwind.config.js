/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wedding: {
          beige: '#F5EFE6',
          cream: '#FBF7F0',
          brown: '#6B4423',
          dark: '#4A2C17',
          gold: '#C9A66B',
        }
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        jost: ['Jost', 'sans-serif'],
      },
      boxShadow: {
        'wedding': '0 4px 20px -2px rgba(107, 68, 35, 0.12)',
        'wedding-lg': '0 10px 30px -5px rgba(107, 68, 35, 0.18)',
      }
    },
  },
  plugins: [],
}

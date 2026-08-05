/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      spacing: {
      'side': '96px',
    },
    colors:{
      'primaryColor': '#153979',
      'secondaryColor': '#FF6B00',
    }
    },
  },
  plugins: [],
}


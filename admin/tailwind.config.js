/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primaryColor: "#153979",
        secondaryColor: "#FF6B00",
      },
    },
  },
  plugins: [],
}

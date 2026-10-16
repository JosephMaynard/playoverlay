/** @type {import('tailwindcss').Config} */
module.exports = {
  // The on-air screens live in the screens workspace package and use
  // Tailwind utilities too; without its sources here those classes are
  // purged from the built CSS and the graphics lose their styling.
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './packages/screens/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [require('@tailwindcss/forms')],
}

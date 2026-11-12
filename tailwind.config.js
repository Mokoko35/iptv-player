/** @type {import('tailwindcss').Config} */
// Colors come from CSS variables (see src/index.css), so a theme change recolors everything,
// and Tailwind's opacity shorthand (bg-accent/15) works.
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        accent: 'rgb(var(--accent-rgb) / <alpha-value>)',
        danger: 'rgb(var(--danger-rgb) / <alpha-value>)',
        canvas: 'rgb(var(--bg-rgb) / <alpha-value>)',
        nav: 'rgb(var(--nav-rgb) / <alpha-value>)',
        rail: 'rgb(var(--rail-rgb) / <alpha-value>)',
        elev: 'rgb(var(--elev-rgb) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}

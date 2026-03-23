/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0f1923',
        surface: '#1a2535',
        border:  '#2a3a50',
        accent:  '#7ec8a4',
        'accent-dark': '#5db88a',
        muted:   '#8a9bb0',
        text:    '#e8e0d5',
        danger:  '#e07070',
        warn:    '#f0c060',
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body:    ['"Source Sans 3"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

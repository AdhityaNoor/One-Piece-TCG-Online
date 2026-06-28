/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/app/**/*.{ts,tsx}', './src/board/**/*.{ts,tsx}', './src/animations/**/*.{ts,tsx}', './src/renderer3d/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Visual-reference direction (UI polish only — Tailwind tokens carry
      // zero game-rule meaning, per project rule "animations/visuals must
      // never control game rules"): a dark navy header/shell, light
      // lavender-tinted card surfaces, a red primary action color and a gold
      // accent for "premium"/highlight badges. Modeled after the optcgcustom.app
      // reference look the user asked the shared UI components to follow.
      colors: {
        navy: {
          950: '#070b1c',
          900: '#0b1230',
          800: '#101a3f',
          700: '#172657',
        },
        brand: {
          DEFAULT: '#e2231a',
          600: '#e2231a',
          700: '#c01b14',
        },
        gold: {
          DEFAULT: '#d9a441',
          600: '#d9a441',
        },
        surface: {
          DEFAULT: '#ffffff',
          card: '#dde6f9',
          cardHover: '#ccdaf4',
          panel: '#e8edfb',
        },
      },
      fontFamily: {
        display: ['Poppins', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'system-ui', 'sans-serif'],
        body: ['Poppins', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

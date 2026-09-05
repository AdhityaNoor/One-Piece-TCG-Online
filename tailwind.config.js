/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/app/**/*.{ts,tsx}',
    './src/board/**/*.{ts,tsx}',
    './src/animations/**/*.{ts,tsx}',
    './src/renderer3d/**/*.{ts,tsx}',
    // Admin CMS lives outside src/app (own top-level folder — see
    // src/admin/AdminApp.tsx) so it was missing from this list entirely.
    // Tailwind only generates utility CSS for classes it finds by scanning
    // these globs; any admin-only utility (e.g. bg-sky-600, which appears
    // nowhere else in the scanned folders) was silently dropped from the
    // production build, which is why the CMS rendered unstyled after
    // `vite build` despite looking fine in local dev with a warm JIT cache.
    './src/admin/**/*.{ts,tsx}',
    // Feature modules (tutorial, etc.) live outside src/app for the same
    // reason admin does, and were missing here for the same reason — the
    // tutorial's whole overlay UI rendered unstyled because none of its
    // utilities were ever generated.
    './src/features/**/*.{ts,tsx}',
  ],
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
      // Titles/headings use Oxanium (squared, techy display face); subtitles,
      // body copy and general content use Metrophobic. Both are loaded by the
      // Google Fonts @import at the top of src/app/styles/index.css.
      // NOTE: Metrophobic ships a single 400 weight, so font-bold/font-black
      // on body text renders as a synthesized (faux) bold — headings that
      // need real weight should use font-display/font-heading.
      fontFamily: {
        display: ['Oxanium', 'system-ui', 'sans-serif'],
        heading: ['Oxanium', 'system-ui', 'sans-serif'],
        body: ['Metrophobic', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

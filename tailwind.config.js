/** @type {import('tailwindcss').Config} */
module.exports = {
  // The on-air screens live in the screens workspace package and use
  // Tailwind utilities too; without its sources here those classes are
  // purged from the built CSS and the graphics lose their styling.
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './packages/screens/src/**/*.{js,ts,jsx,tsx}',
  ],
  // The control window sets data-theme on <html> from the operator's
  // Appearance setting (or the OS preference). A selector rather than the
  // media query, so "Light" wins outdoors even on a machine set to dark.
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      // Semantic colours read from the CSS variables in src/index.css, so
      // every component gets both themes from one class. The on-air graphics
      // keep their own fixed colours; only the dashboard uses these.
      colors: {
        bg: 'rgb(var(--c-bg) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--c-surface) / <alpha-value>)',
          2: 'rgb(var(--c-surface-2) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--c-line) / <alpha-value>)',
          strong: 'rgb(var(--c-line-strong) / <alpha-value>)',
        },
        fg: 'rgb(var(--c-fg) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        accent: {
          DEFAULT: 'rgb(var(--c-accent) / <alpha-value>)',
          hover: 'rgb(var(--c-accent-hover) / <alpha-value>)',
          fg: 'rgb(var(--c-accent-fg) / <alpha-value>)',
          soft: 'rgb(var(--c-accent-soft) / <alpha-value>)',
        },
        live: {
          DEFAULT: 'rgb(var(--c-live) / <alpha-value>)',
          hover: 'rgb(var(--c-live-hover) / <alpha-value>)',
          fg: 'rgb(var(--c-live-fg) / <alpha-value>)',
          soft: 'rgb(var(--c-live-soft) / <alpha-value>)',
          ink: 'rgb(var(--c-live-ink) / <alpha-value>)',
        },
        danger: {
          DEFAULT: 'rgb(var(--c-danger) / <alpha-value>)',
          hover: 'rgb(var(--c-danger-hover) / <alpha-value>)',
          fg: 'rgb(var(--c-danger-fg) / <alpha-value>)',
          soft: 'rgb(var(--c-danger-soft) / <alpha-value>)',
          ink: 'rgb(var(--c-danger-ink) / <alpha-value>)',
        },
        warn: {
          DEFAULT: 'rgb(var(--c-warn) / <alpha-value>)',
          soft: 'rgb(var(--c-warn-soft) / <alpha-value>)',
          ink: 'rgb(var(--c-warn-ink) / <alpha-value>)',
        },
        ink: {
          DEFAULT: 'rgb(var(--c-ink) / <alpha-value>)',
          fg: 'rgb(var(--c-ink-fg) / <alpha-value>)',
        },
        overlay: 'rgb(var(--c-overlay) / <alpha-value>)',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};

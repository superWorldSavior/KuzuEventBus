// @ts-check
import typography from '@tailwindcss/typography';
import tailwindScrollbar from 'tailwind-scrollbar';

/** @type {import('tailwindcss').Config} */
const config = {
  darkMode: 'class',
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    './src/pages/**/*.mdx',
    './src/components/**/*.astro',
  ],
  theme: {
    extend: {
      colors: {
        'brand-yellow': '#ffde59',
        'brand-blue': '#05004b',
        'brand-cyan': '#00ffff',
        'brand-red': '#ff0000',
        cassis: {
          50: '#fdf4ff',
          100: '#fae8ff',
          200: '#f5d0fe',
          300: '#f0abfc',
          400: '#e879f9',
          500: '#d946ef',
          600: '#c026d3',
          700: '#a21caf',
          800: '#86198f',
          900: '#701a75',
          950: '#4a044e',
        },
      },
    },
  },
  plugins: [
    typography,
    tailwindScrollbar({ nocompatible: true, preferredStrategy: 'pseudoelements' }),
  ],
};

export default config;

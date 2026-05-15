import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#081833',
          900: '#0a1a3a',
          800: '#0d2350',
          700: '#1a4fc2',
        },
        gold: {
          DEFAULT: '#ffc220',
          light: '#ffd84d',
          dark: '#cc9a00',
        },
        marble: {
          blue: '#6ec1ff',
          green: '#2ecc71',
          red: '#e74c3c',
          purple: '#9b59b6',
        },
      },
      fontFamily: {
        heading: ['"Lilita One"', 'cursive'],
        body: ['"Fredoka"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;

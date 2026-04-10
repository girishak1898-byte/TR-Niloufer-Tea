import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        chai: {
          50: '#fdf8f0',
          100: '#f9edd8',
          200: '#f2d7ad',
          300: '#e9bb78',
          400: '#df9a42',
          500: '#d68325',
          600: '#c86b1b',
          700: '#a65219',
          800: '#85421c',
          900: '#6d3719',
        },
      },
    },
  },
  plugins: [],
};

export default config;

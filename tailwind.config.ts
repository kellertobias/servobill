/* eslint-disable unicorn/prefer-module */
/* eslint-disable import/no-extraneous-dependencies */
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  safelist: [
    'bg-blue-700',
    { pattern: /col-span-\d+/ },
    // All padding and margin classes including negative values and scoped
    {
      pattern: /p([blrtxy])-\d+/,
      variants: ['xs', 'sm', 'lg', 'md', 'xl', '2xl'],
    },
    {
      pattern: /m([blrtxy])-\d+/,
      variants: ['xs', 'sm', 'lg', 'md', 'xl', '2xl'],
    },
    {
      pattern: /-m([blrtxy])-\d+/,
      variants: ['xs', 'sm', 'lg', 'md', 'xl', '2xl'],
    },
    {
      pattern: /-p([blrtxy])-\d+/,
      variants: ['xs', 'sm', 'lg', 'md', 'xl', '2xl'],
    },
    { pattern: /p([blrtxy])-\d+/ },
    { pattern: /m([blrtxy])-\d+/ },
    { pattern: /-m([blrtxy])-\d+/ },
    { pattern: /-p([blrtxy])-\d+/ },
    { pattern: /p-\d+/, variants: ['xs', 'sm', 'lg', 'md', 'xl', '2xl'] },
    { pattern: /m-\d+/, variants: ['xs', 'sm', 'lg', 'md', 'xl', '2xl'] },
    { pattern: /-m-\d+/, variants: ['xs', 'sm', 'lg', 'md', 'xl', '2xl'] },
    { pattern: /-p-\d+/, variants: ['xs', 'sm', 'lg', 'md', 'xl', '2xl'] },
    { pattern: /p-\d+/ },
    { pattern: /w-\d+/ },
    { pattern: /h-\d+/ },
    { pattern: /m-\d+/ },
    { pattern: /-m-\d+/ },
    { pattern: /-p-\d+/ },

    // All Grid Classes
    {
      pattern: /col-span-\d+/,
      variants: ['xs', 'sm', 'lg', 'md', 'xl', '2xl'],
    },
    {
      pattern: /row-span-\d+/,
      variants: ['xs', 'sm', 'lg', 'md', 'xl', '2xl'],
    },
    {
      pattern: /grid-cols-\d+/,
      variants: ['xs', 'sm', 'lg', 'md', 'xl', '2xl'],
    },
    { pattern: /gap-\d+/, variants: ['xs', 'sm', 'lg', 'md', 'xl', '2xl'] },
    { pattern: /col-span-\d+/ },
    { pattern: /row-span-\d+/ },
    { pattern: /grid-cols-\d+/ },
    { pattern: /gap-\d+/ },
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
      },
      aspectRatio: {
        a4: '210 / 297',
      },
    },
  },
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/aspect-ratio')],
};
export default config;

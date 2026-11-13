const { config: dotenvConfig } = require('dotenv');

dotenvConfig();
// Only load .env.dev in development mode
if (process.env.NODE_ENV === 'development') {
  dotenvConfig({ path: '.env.dev', override: true });
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  devIndicators: {
    buildActivity: true,
    buildActivityPosition: 'bottom-right',
  },
  typescript: {
    tsconfigPath: './tsconfig.next.json',
  },
  serverExternalPackages: [
    'graphql',
    'graphql-scalars',
    'type-graphql',
    '@apollo/server',
    'typeorm',
    'pino',
  ],
  // Next 16 defaults to turbopack for `next build`.
};

module.exports = nextConfig;

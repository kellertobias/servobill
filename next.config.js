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
  experimental: {
    serverComponentsExternalPackages: ["graphql", "typeorm"],
  },
  eslint: {
    ignoreDuringBuilds: true,
  }
};

module.exports = nextConfig;

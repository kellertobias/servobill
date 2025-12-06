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
  serverExternalPackages: ["graphql", "typeorm"],
  webpack: {
    devtool: "source-map",
  },
  // We use webpack config for source maps, so we disable turbopack for now to match previous behavior or explicitly opt-in to webpack.
  // Next 16 defaults to turbopack for `next build`.
};

module.exports = nextConfig;

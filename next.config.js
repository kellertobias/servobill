const { config: dotenvConfig } = require('dotenv');

dotenvConfig();
// Only load .env.dev in development mode
if (process.env.NODE_ENV === 'development') {
  dotenvConfig({ path: '.env.dev', override: true });
}

/**
 * Security headers for every page and API route served by Next.js.
 * The CSP only restricts framing, plugins, <base> and form targets: the app
 * loads logos and files from configurable hosts, so script/style/connect
 * sources are not restricted here.
 */
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'",
  },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(self), microphone=(), geolocation=(), payment=(), usb=()',
  },
  // Ignored by browsers on plain HTTP, so local installs are not affected.
  { key: 'Strict-Transport-Security', value: 'max-age=15552000' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
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

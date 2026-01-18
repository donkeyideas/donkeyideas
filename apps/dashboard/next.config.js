/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@donkey-ideas/database',
    '@donkey-ideas/ui',
    '@donkey-ideas/auth',
    '@donkey-ideas/config',
  ],
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;



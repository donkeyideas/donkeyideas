/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@donkey-ideas/database',
    '@donkey-ideas/ui',
    '@donkey-ideas/auth',
    '@donkey-ideas/config',
  ],
};

module.exports = nextConfig;



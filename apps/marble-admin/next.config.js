/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@donkey-ideas/database',
    '@donkey-ideas/auth',
  ],
};

module.exports = nextConfig;

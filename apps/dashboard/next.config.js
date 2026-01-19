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
  // Increase body size limit for image uploads (50MB)
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
  // Allow external images from any domain
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

module.exports = nextConfig;



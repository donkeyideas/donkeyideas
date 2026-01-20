/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    '@donkey-ideas/database',
    '@donkey-ideas/ui',
    '@donkey-ideas/auth',
    '@donkey-ideas/config',
    '@donkey-ideas/financial-engine',
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
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

module.exports = nextConfig;



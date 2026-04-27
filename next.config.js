/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    after: true,
  },
  serverExternalPackages: ['imghash', 'sharp'],
};

module.exports = nextConfig;

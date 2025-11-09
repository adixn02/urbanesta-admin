/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002',
  },
  eslint: {
    // Don't fail build on ESLint warnings during production builds
    ignoreDuringBuilds: false, // Keep false to catch errors, but warnings won't block
  },
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3002',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'urbanesta-assets.s3.ap-south-1.amazonaws.com',
        port: '',
        pathname: '/img-assets/**',
      },
      {
        protocol: 'https',
        hostname: 'd8pw2hr56z2an.cloudfront.net',
        port: '',
        pathname: '/img-assets/**',
      },
      {
        protocol: 'https',
        hostname: '*.s3.amazonaws.com',
        port: '',
        pathname: '/img-assets/**',
      },
      {
        protocol: 'https',
        hostname: '*.cloudfront.net',
        port: '',
        pathname: '/img-assets/**',
      },
    ],
  },
};

export default nextConfig;

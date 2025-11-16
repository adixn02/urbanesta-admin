/** @type {import('next').NextConfig} */
const nextConfig = {
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002',
  },

  // Build configuration
  eslint: {
    ignoreDuringBuilds: false, // Catch errors during build
  },
  typescript: {
    ignoreBuildErrors: false, // Catch type errors during build
  },

  // Production optimizations
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header for security
  generateEtags: true, // Enable ETags for caching
  
  // React strict mode for catching issues
  reactStrictMode: true,

  // Note: swcMinify is enabled by default in Next.js 15, no need to specify

  // Image optimization
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
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    formats: ['image/webp'],
  },

  // Headers for caching and security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Experimental features for better performance
  experimental: {
    // optimizeCss: true, // Disabled - requires 'critters' package. Install with: npm install critters
    optimizePackageImports: ['bootstrap', 'bootstrap-icons'],
  },

  // Output configuration
  output: 'standalone', // Optimized for production deployment
};

export default nextConfig;

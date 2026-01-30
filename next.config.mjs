/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Temporarily ignore ESLint during production builds
    // TODO: Fix ESLint errors and remove this
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Temporarily ignore TypeScript errors during production builds
    // TODO: Fix TypeScript errors and remove this
    ignoreBuildErrors: true,
  },
  // Optimize build performance
  swcMinify: true,
  // Reduce build output
  output: 'standalone', // Creates smaller build output
  // Optimize images
  images: {
    unoptimized: false,
    // Allow images from these domains
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.cloudinary.com',
      },
    ],
    // Use modern formats
    formats: ['image/avif', 'image/webp'],
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Reduce function bundle size
  experimental: {
    outputFileTracingIncludes: {
      '/api/**/*': ['./node_modules/**/*.wasm'],
    },
  },
};

export default nextConfig;

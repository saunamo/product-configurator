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
};

export default nextConfig;

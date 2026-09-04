/** @type {import('next').NextConfig} */
module.exports = {
  distDir: 'build',
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'supabase-200880.appspot.com',
      },
    ],
  },
  compress: true,
  productionBrowserSourceMaps: false,
  // Performance optimizations
  poweredByHeader: false,
  // Enable SWC minification (default in Next 13+)
  swcMinify: true,
  // Optimize fonts
  optimizeFonts: true,
  // Experimental features for better performance
  experimental: {
    // Optimize package imports for lucide-react
    optimizePackageImports: ['lucide-react'],
  },
};

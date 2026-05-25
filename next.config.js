module.exports = {
  distDir: 'build',
  reactStrictMode: true,
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
};

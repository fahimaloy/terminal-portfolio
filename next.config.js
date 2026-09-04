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
  poweredByHeader: false,
  swcMinify: true,
  optimizeFonts: true,
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // Optional CORS avoidance for LOCAL self-hosted Supabase: proxy REST via Next.js (same-origin for the browser).
  // Disabled by default (USE_SUPABASE_PROXY !== 'true' returns []). Supabase Cloud does NOT need this proxy.
  // Enable for local flow only with: USE_SUPABASE_PROXY=true NEXT_PUBLIC_SUPABASE_URL=http://localhost:3838
  async rewrites() {
    const proxyEnabled = process.env.USE_SUPABASE_PROXY === 'true';
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!proxyEnabled || !supabaseUrl) {
      return [];
    }
    const origin = supabaseUrl.replace(/\/+$/, '');
    return [
      { source: '/rest/v1/:path*', destination: `${origin}/rest/v1/:path*` },
      { source: '/auth/v1/:path*', destination: `${origin}/auth/v1/:path*` },
      { source: '/storage/v1/:path*', destination: `${origin}/storage/v1/:path*` },
      { source: '/realtime/v1/:path*', destination: `${origin}/realtime/v1/:path*` },
    ];
  },
  // Fallback CORS headers for same-origin API routes; real CORS is handled by Kong.
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,PATCH,DELETE,OPTIONS' },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'apikey, authorization, content-type, prefer, accept, x-client-info, x-upsert',
          },
        ],
      },
    ];
  },
};

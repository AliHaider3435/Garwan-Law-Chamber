/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    GLC_DEPLOYMENT_ENV: process.env.VERCEL_ENV ?? '',
    GLC_SUPABASE_SERVER_CONFIGURED: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'true' : 'false',
  },
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: { formats: ['image/avif', 'image/webp'] },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude problematic packages from server bundling
  serverExternalPackages: [
    'pdf-parse',
    'pdfkit',
    'fontkit',
    'linebreak',
    'canvas',
    '@napi-rs/canvas',
    '@react-pdf/renderer',
    '@react-pdf/layout',
    '@react-pdf/pdfkit',
  ],
  
  // Empty turbopack config to satisfy Next.js 16 requirement
  turbopack: {},

  // Configure caching headers for static assets
  async headers() {
    return [
      {
        // Static assets (images, fonts, etc.) - cache for 1 year
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Font files - cache for 1 year
        source: '/:path*.woff2',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // API routes - no caching by default (dynamic data)
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate',
          },
        ],
      },
      {
        // Security headers for all routes
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: { remotePatterns: [] },
  // Render and Vercel terminate TLS in front of the app; these origins must be
  // trusted for server actions to accept form posts from the real host.
  experimental: {
    serverActions: {
      allowedOrigins: [
        "ludoarenademo-1.onrender.com",
        "ludo-arena-web.onrender.com",
        "*.onrender.com",
        "*.vercel.app",
        "*.e2b.app",
      ],
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;

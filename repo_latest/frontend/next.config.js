const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
  compress: true,
  generateEtags: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-XSS-Protection', value: '1; mode=block' }
        ]
      }
    ];
  },
  async rewrites() {
    return [
      { source: '/api/:path*', destination: 'http://localhost:3000/api/:path*' }
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { fs: false, net: false, tls: false };
    }
    return config;
  },
  experimental: {
    optimizePackageImports: ['@paradigm/gspl-platform']
  }
};

module.exports = nextConfig;
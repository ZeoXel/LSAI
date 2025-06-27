import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/chat/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
      {
        source: '/api/image/:path*',
        destination: 'http://localhost:9000/api/:path*',
      },
      {
        source: '/api/video/:path*',
        destination: 'http://localhost:5001/api/:path*',
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
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
  
  // 🔧 实验性功能
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },
  
  // 🔧 图像优化配置
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;

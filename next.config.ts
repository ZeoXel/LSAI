import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

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

// Sentry配置选项
const sentryWebpackPluginOptions = {
  // 上传source maps到Sentry以便更好的错误追踪
  silent: true, // 减少构建时的日志输出
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  
  // 只在生产环境上传source maps
  uploadSourceMaps: process.env.NODE_ENV === "production",
  
  // 隐藏source maps以保护源代码
  hideSourceMaps: true,
  
  // 禁用遥测数据收集
  telemetry: false,
  
  // 构建时配置
  widenClientFileUpload: true,
  
  // 错误过滤
  ignore: ['node_modules'],
};

// 只在配置了Sentry DSN时才启用Sentry
export default process.env.NEXT_PUBLIC_SENTRY_DSN 
  ? withSentryConfig(nextConfig, sentryWebpackPluginOptions)
  : nextConfig;

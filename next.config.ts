import type { Configuration } from "webpack";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false, // ✅ 啟用 TypeScript 型別檢查
  },
  reactStrictMode: true, // ✅ 啟用 React Strict Mode 以提早發現問題
  // Next.js 16 Turbopack 配置
  turbopack: {},
  // 添加 images 配置
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/api/images/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/api/images/**",
      },
      {
        protocol: "http",
        hostname: "13.114.4.21",
        pathname: "/api/images/**",
      },
      {
        protocol: "https",
        hostname: "13.114.4.21",
        pathname: "/api/images/**",
      },
      {
        protocol: "https",
        hostname: "yoshi3166.com",
        pathname: "/api/images/**",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
  // 添加 CORS 設定（生產環境需要配置 ALLOWED_ORIGINS）
  async headers() {
    const isProduction = process.env.NODE_ENV === 'production';

    // 🔒 安全：生產環境必須設置 ALLOWED_ORIGINS
    if (isProduction && !process.env.ALLOWED_ORIGINS) {
      console.warn('⚠️ 警告：生產環境未設置 ALLOWED_ORIGINS，CORS 將使用預設值');
    }

    // 獲取允許的來源
    const allowedOrigin = isProduction
      ? (process.env.ALLOWED_ORIGINS?.split(',')[0]?.trim() || 'https://your-domain.com')
      : 'http://localhost:3000';

    return [
      // API 路由 CORS 設定
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: allowedOrigin,
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,POST,PUT,DELETE,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization",
          },
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
        ],
      },
      // 靜態圖片快取（1 年）- 減少重複請求
      {
        source: "/api/images/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
      // 靜態資源快取（JS、CSS、字體等）
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // 上傳檔案快取
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
  webpack: (config: Configuration, { isServer }: { isServer: boolean }) => {
    // 確保 config.resolve 與 alias 存在
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    if (!Array.isArray(config.resolve.alias)) {
      (
        config.resolve.alias as { [key: string]: string | false | string[] }
      ).canvas = false;
    }

    // 確保 config.module 與 config.module.rules 存在
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /\.pdf$/,
      type: "asset/resource",
      generator: {
        filename: "static/pdf/[hash][ext][query]",
      },
    });

    return config;
  },
};

export default nextConfig;

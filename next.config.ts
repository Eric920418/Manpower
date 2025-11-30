import type { Configuration } from "webpack";

const nextConfig = {
  typescript: {
    ignoreBuildErrors: false, // ✅ 啟用 TypeScript 型別檢查
  },
  reactStrictMode: true, // ✅ 啟用 React Strict Mode 以提早發現問題
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
    const allowedOrigins = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(',')
      : ['http://localhost:3000', 'http://localhost:3001'];

    return [
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Access-Control-Allow-Origin",
            value: process.env.NODE_ENV === 'production'
              ? (process.env.ALLOWED_ORIGINS || '')
              : '*' // 僅開發環境允許所有來源
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

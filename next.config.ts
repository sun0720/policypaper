import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",

  // 🚀 构建性能优化
  productionBrowserSourceMaps: false, // 跳过生产 sourcemap 生成
  poweredByHeader: false,             // 移除 X-Powered-By 头

  // 🚀 图片优化（静态导出兼容）
  images: {
    unoptimized: true, // 静态导出必须；避免构建时的图片处理开销
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",

  // 🚀 构建性能优化
  productionBrowserSourceMaps: false, // 跳过生产 sourcemap 生成
  poweredByHeader: false,             // 移除 X-Powered-By 头

  // 🚀 React 生产模式 — 关闭严格模式减少 JS 开销
  reactStrictMode: false,

  // 🚀 Gzip 预压缩 — 构建时生成 .gz 文件，减少 CDN 实时压缩开销
  compress: true,

  // 🚀 图片优化（静态导出兼容）
  images: {
    unoptimized: true, // 静态导出必须；避免构建时的图片处理开销
  },
};

export default nextConfig;

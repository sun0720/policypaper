import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "中国经济政策论文选题 | EconTopic",
  description:
    "每日 AI 分析中国政府网与新闻联播经济新闻，生成经济学论文选题方向",
  metadataBase: new URL("https://policypaper.pages.dev"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        {/* View Transitions API — 跨页面平滑过渡动画 */}
        <meta name="view-transition" content="same-origin" />
        {/* 预连接外部新闻源 — 提前完成 TCP+TLS 握手 */}
        <link rel="preconnect" href="https://www.gov.cn" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://tv.cctv.com" crossOrigin="anonymous" />
      </head>
      <body>
        <header className="site-header">
          <div className="prose site-header-inner">
            <Link href="/" className="site-brand">
              <img src="/logo.webp" alt="PolicyPaper" className="site-logo-img" width="45" height="45" loading="eager" />
              PolicyPaper
            </Link>
          </div>
        </header>
        <main className="prose site-main">
          {children}
        </main>
        <footer className="site-footer">
          <div className="prose">
            <p></p>
          </div>
        </footer>
      </body>
    </html>
  );
}

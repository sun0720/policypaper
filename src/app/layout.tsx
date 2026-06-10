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
        {/* DNS 预解析 — 提前建立连接 */}
        <link rel="dns-prefetch" href="//www.gov.cn" />
        <link rel="dns-prefetch" href="//tv.cctv.com" />
        {/* 字体渲染优化 — 避免 FOIT */}
        <style dangerouslySetInnerHTML={{
          __html: `@font-face{font-family:'STSong';src:local('Songti SC'),local('Noto Serif SC'),local('SimSun');font-display:swap;size-adjust:105%}`
        }} />
      </head>
      <body>
        <header className="site-header">
          <div className="prose site-header-inner">
            <Link href="/" className="site-brand">
              <img src="/logo.png" alt="PolicyPaper" className="site-logo-img" width="45" height="45" loading="eager" />
              PolicyPaper
            </Link>
          </div>
        </header>
        <main className="prose site-main">
          {children}
        </main>
        <footer className="site-footer">
          <div className="prose">
            <p>
              数据来源：
              <a href="https://www.gov.cn" style={{ color: "var(--accent)" }}>中国政府网</a>
              {" · "}
              <a href="https://tv.cctv.com/lm/xwlb/" style={{ color: "var(--accent)" }}>新闻联播</a>
              {" · "}仅供学术参考
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

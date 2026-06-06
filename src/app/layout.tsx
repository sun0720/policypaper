import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "中国经济政策论文选题 | EconTopic",
  description:
    "每日 AI 分析中国政府网经济新闻，生成经济学论文选题方向",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="site-header">
          <div className="prose" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <a href="/" className="site-brand">
              <img src="/logo.png" alt="PolicyPaper" className="site-logo-img" />
              PolicyPaper
            </a>
          </div>
        </header>
        <main className="prose" style={{ paddingTop: "2rem", paddingBottom: "4rem" }}>
          {children}
        </main>
        <footer className="site-footer">
          <div className="prose">
            <p>
              数据来源：<a href="https://www.gov.cn" style={{ color: "var(--accent)" }}>中国政府网</a>
              {" "}· 仅供学术参考
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

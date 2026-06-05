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
        <header
          style={{
            borderBottom: "1px solid var(--border)",
            padding: "1rem 0",
            marginBottom: "2rem",
          }}
        >
          <div className="prose" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
              <a href="/" style={{ fontWeight: 700, fontSize: "1.2rem", textDecoration: "none", color: "var(--foreground)" }}>
                📰 EconTopic
              </a>
              <nav style={{ display: "flex", gap: "1rem", fontSize: "0.9rem" }}>
                <a href="/" style={{ color: "var(--accent)", textDecoration: "none" }}>首页</a>
                <a href="/archive" style={{ color: "var(--muted)", textDecoration: "none" }}>归档</a>
              </nav>
            </div>
            <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
              每日经济学论文选题
            </span>
          </div>
        </header>
        <main className="prose" style={{ paddingBottom: "4rem" }}>
          {children}
        </main>
        <footer
          style={{
            borderTop: "1px solid var(--border)",
            padding: "2rem 0",
            marginTop: "4rem",
            textAlign: "center",
            fontSize: "0.85rem",
            color: "var(--muted)",
          }}
        >
          <div className="prose">
            <p>
              数据来源：<a href="https://www.gov.cn" style={{ color: "var(--accent)" }}>中国政府网</a>
              {" "}· AI 分析：Claude · 仅供学术参考
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}

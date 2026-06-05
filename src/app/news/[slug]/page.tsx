/**
 * 选题详情页 — 展示单条新闻 + 全部 5 个论文选题完整信息
 * 路由：/news/[slug]
 * 含内页选题目录导航，支持快速跳转
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getNewsBySlug, getAllGroupedByDate } from "@/lib/data";
import { Breadcrumb } from "@/components/Breadcrumb";
import { FieldBadge } from "@/components/Badge";
import { TopicCard } from "@/components/TopicCard";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const exports = getAllGroupedByDate();
  return exports.flatMap((e) => e.news.map((n) => ({ slug: n.slug })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const result = getNewsBySlug(slug);
  if (!result) return { title: "未找到 | EconTopic" };
  return {
    title: `${result.news.title} | EconTopic`,
    description: `${result.news.economicField}：${result.news.topics.length} 个论文选题`,
  };
}

export default async function NewsDetailPage({ params }: Props) {
  const { slug } = await params;
  const result = getNewsBySlug(slug);

  if (!result) notFound();

  const { news, date } = result;

  return (
    <>
      <Breadcrumb
        items={[
          { label: "首页", href: "/" },
          { label: date, href: `/date/${date}` },
          { label: news.title.slice(0, 30) + (news.title.length > 30 ? "…" : "") },
        ]}
      />

      {/* === 新闻头部 === */}
      <header style={{ marginBottom: "2rem" }}>
        <div style={{ marginBottom: "0.5rem" }}>
          <FieldBadge field={news.economicField} />
          {news.subField && (
            <span style={{ marginLeft: "0.5rem", fontSize: "0.85rem", color: "var(--muted)" }}>
              {news.subField}
            </span>
          )}
        </div>

        <h1>{news.title}</h1>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.9rem", color: "var(--muted)" }}>
          <span>📅 发布日期：{date}</span>
          <span>
            🔗{" "}
            <a href={news.url} target="_blank" rel="noopener noreferrer"
               style={{ color: "var(--accent)", textDecoration: "underline" }}>
              原文链接
            </a>
          </span>
          <span>🎓 {news.topics.length} 个论文选题</span>
        </div>
      </header>

      {/* === 选题内页目录（快速跳转） === */}
      <nav
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "6px",
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          fontSize: "0.9rem",
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: "0.5rem", color: "var(--accent)" }}>
          📑 本页目录
        </div>
        <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          {news.topics.map((t) => (
            <li key={t.sortOrder}>
              <a
                href={`#topic-${t.sortOrder}`}
                style={{
                  color: "var(--foreground)",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                  {t.perspective}：
                </span>
                {t.title.length > 48 ? t.title.slice(0, 48) + "…" : t.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {/* === 论文选题区 === */}
      <section>
        <h2 style={{ marginBottom: "1rem" }}>
          🎓 论文选题（{news.topics.length} 个）
        </h2>

        {news.topics.map((topic) => (
          <TopicCard key={topic.sortOrder} topic={topic} />
        ))}
      </section>

      {/* === 底部导航 === */}
      <nav className="page-footer-nav">
        <a href={`/date/${date}`} style={{ color: "var(--accent)", textDecoration: "none" }}>
          ← 返回 {date}
        </a>
        <a href="#top" style={{ color: "var(--accent)", textDecoration: "none" }}>
          ↑ 回到顶部
        </a>
        <a href="/" style={{ color: "var(--accent)", textDecoration: "none" }}>
          返回首页
        </a>
      </nav>
    </>
  );
}

/**
 * NewsCard — 新闻摘要卡片 + 折叠式选题预览
 * 用于首页和日期页列表
 */
import React, { memo } from "react";
import Link from "next/link";
import type { NewsData } from "@/lib/parser";
import { FieldBadgeSm } from "./Badge";

interface NewsCardProps {
  news: NewsData;
  date: string;
}

export const NewsCard = memo(function NewsCard({ news, date }: NewsCardProps) {
  const sourceLabel = news.source === "cctv" ? "新闻联播" : "中国政府网";
  const sourceClass = news.source === "cctv" ? "cctv" : "gov";

  return (
    <article className="news-card">
      {/* 领域标签 + 来源徽章 */}
      <div className="news-meta">
        <FieldBadgeSm field={news.economicField} />
        <span className={`news-source-badge ${sourceClass}`}>
          {news.source === "cctv" ? "📺" : "🇨🇳"} {sourceLabel}
        </span>
      </div>

      {/* 新闻标题 + 原文链接 */}
      <h2 className="news-title-row">
        <Link
          href={`/news/${news.slug}`}
          style={{ textDecoration: "none" }}
        >
          {news.title}
        </Link>
        <a
          className="news-source-inline"
          href={news.url}
          target="_blank"
          rel="noopener noreferrer"
        >
          → 原文
        </a>
      </h2>

      {/* 正文摘要 */}
      {news.content && (
        <p className="news-excerpt">
          {news.content.slice(0, 150)}
          {news.content.length > 150 ? "…" : ""}
        </p>
      )}

      {/* 选题摘要（可折叠） */}
      <details>
        <summary>🎓 {news.topics.length} 个论文选题</summary>
        <ol>
          {news.topics.map((t) => (
            <li key={t.sortOrder}>
              <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                {t.perspective}：
              </span>
              {t.title}
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
});

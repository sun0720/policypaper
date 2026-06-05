/**
 * NewsCard — 新闻摘要卡片 + 折叠式选题预览
 * 用于首页和日期页列表
 */
import React from "react";
import Link from "next/link";
import type { NewsData } from "@/lib/parser";
import { FieldBadgeSm } from "./Badge";

interface NewsCardProps {
  news: NewsData;
  date: string;
}

export function NewsCard({ news, date }: NewsCardProps) {
  return (
    <article className="news-card">
      {/* 领域标签 + 日期 */}
      <div className="news-meta">
        <FieldBadgeSm field={news.economicField} />
        <span>{date}</span>
      </div>

      {/* 新闻标题 */}
      <h2>
        <Link
          href={`/news/${news.slug}`}
          style={{ color: "var(--foreground)", textDecoration: "none" }}
        >
          {news.title}
        </Link>
      </h2>

      {/* 原文链接 */}
      <div className="news-source">
        <a
          href={news.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--accent)", textDecoration: "underline" }}
        >
          原文链接 →
        </a>
      </div>

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
}

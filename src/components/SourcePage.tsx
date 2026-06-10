/**
 * SourcePage — 双源切换首页客户端组件
 * 读取 ?source=gov | cctv 查询参数，过滤新闻来源
 * 使用 useSearchParams，需 Suspense 包裹
 */
"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { DailyExport, NewsData } from "@/lib/parser";
import { NewsCard } from "./NewsCard";
import { DateSidebar } from "./DateSidebar";

interface SourcePageProps {
  allExports: DailyExport[];
  allDates: { date: string; newsCount: number; topicsCount: number; fields: string[] }[];
}

/** 需要 useSearchParams 的内部组件 */
function SourcePageInner({ allExports, allDates }: SourcePageProps) {
  const searchParams = useSearchParams();
  const sourceParam = searchParams.get("source");
  const source = sourceParam === "cctv" ? "cctv" : "gov";

  // 过滤新闻
  const filtered = useMemo(() => {
    return allExports
      .map((exp) => {
        const filteredNews = exp.news.filter(
          (n: NewsData) => (n.source || "gov") === source
        );
        if (filteredNews.length === 0) return null;
        const topicsCount = filteredNews.reduce(
          (s, n) => s + n.topics.length,
          0
        );
        const fields = [...new Set(filteredNews.map((n) => n.economicField))];
        return {
          ...exp,
          news: filteredNews,
          newsCount: filteredNews.length,
          topicsCount,
          fields,
        };
      })
      .filter(Boolean) as DailyExport[];
  }, [allExports, source]);

  // 过滤日期列表
  const filteredDates = useMemo(() => {
    const dateSet = new Set(filtered.map((e) => e.date));
    return allDates.filter((d) => dateSet.has(d.date));
  }, [allDates, filtered]);

  const isGov = source === "gov";

  return (
    <>
      {/* Hero 区域 */}
      <section className="page-hero">
        <div className="source-tabs">
          <Link
            href="/?source=gov"
            className={`source-tab ${isGov ? "active" : ""}`}
            scroll={false}
          >
            🇨🇳 中国政府网
          </Link>
          <Link
            href="/?source=cctv"
            className={`source-tab ${!isGov ? "active" : ""}`}
            scroll={false}
          >
            📺 新闻联播
          </Link>
        </div>
        <h1>
          {isGov ? "中国政府网 · 经济学论文选题" : "新闻联播 · 经济学论文选题"}
        </h1>
        <p>
          {isGov
            ? "依据中国政府网的经济新闻，AI 分析生成经济学论文选题方向"
            : "依据新闻联播的经济片段，AI 分析生成经济学论文选题方向"}
        </p>
      </section>

      <div className="content-layout">
        {/* 左侧日期导航 */}
        <div className="sidebar-column">
          <DateSidebar dates={filteredDates} />
        </div>

        {/* 右侧主内容 */}
        <div className="content-main">
          <section>
            {filtered.length === 0 && (
              <p
                style={{
                  color: "var(--muted)",
                  textAlign: "center",
                  padding: "3rem 0",
                }}
              >
                {isGov
                  ? "暂无数据。请先运行 gov-scraper → paper-topic-analyzer 生成论文选题。"
                  : "暂无数据。请先运行 cctv-scraper → paper-topic-analyzer 生成论文选题。"}
              </p>
            )}

            {filtered.map((daily) => (
              <div key={`${daily.date}-${source}`} className="date-section">
                <div className="date-heading">
                  <h2 style={{ margin: 0 }}>
                    <Link
                      href={`/date/${daily.date}`}
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      {daily.date}
                    </Link>
                  </h2>
                  <span
                    style={{ fontSize: "0.85rem", color: "var(--muted)" }}
                  >
                    {daily.newsCount} 条新闻 · {daily.topicsCount} 个选题
                  </span>
                </div>

                {daily.news.map((news) => (
                  <NewsCard key={news.slug} news={news} date={daily.date} />
                ))}
              </div>
            ))}
          </section>
        </div>
      </div>
    </>
  );
}

/** 骨架屏：Suspense fallback — 匹配 Hero + 双栏布局视觉 */
function SourcePageFallback() {
  return (
    <>
      <section className="page-hero">
        <div className="source-tabs">
          <span className="source-tab active">🇨🇳 中国政府网</span>
          <span className="source-tab">📺 新闻联播</span>
        </div>
        <h1>经济学论文选题</h1>
        <p>加载中…</p>
      </section>
      <div className="content-layout">
        <div className="sidebar-column" />
        <div className="content-main">
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "3rem 0" }}>
            正在加载…
          </p>
        </div>
      </div>
    </>
  );
}

/** 导出的包装组件，含 Suspense */
export function SourcePage(props: SourcePageProps) {
  return (
    <Suspense fallback={<SourcePageFallback />}>
      <SourcePageInner {...props} />
    </Suspense>
  );
}

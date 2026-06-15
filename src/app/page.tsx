/**
 * 首页 — 全量服务端渲染，CSS 驱动双源切换
 * 所有内容均在构建时生成到 HTML，无需客户端 JS 即可显示
 * SourceTabs 客户端组件替代 inline <script>，解决 Next.js
 * 客户端导航后事件丢失的问题
 */
import Link from "next/link";
import { getAllGroupedByDate, getAllDates } from "@/lib/data";
import { NewsCard } from "@/components/NewsCard";
import { DateSidebar } from "@/components/DateSidebar";
import { SourceTabs } from "@/components/SourceTabs";
import type { DailyExport, NewsData } from "@/lib/parser";

/** 按来源过滤并重建 DailyExport 列表 */
function filterBySource(
  exports: DailyExport[],
  source: "gov" | "cctv"
): DailyExport[] {
  return exports
    .map((exp) => {
      const filteredNews = exp.news.filter(
        (n: NewsData) => (n.source || "gov") === source
      );
      if (filteredNews.length === 0) return null;
      return {
        ...exp,
        news: filteredNews,
        newsCount: filteredNews.length,
        topicsCount: filteredNews.reduce((s, n) => s + n.topics.length, 0),
        fields: [...new Set(filteredNews.map((n) => n.economicField))],
      };
    })
    .filter(Boolean) as DailyExport[];
}

/** 渲染一个来源的内容区块 */
function SourceSection({
  source,
  exports: allExports,
  allDates,
  isDefault,
}: {
  source: "gov" | "cctv";
  exports: DailyExport[];
  allDates: { date: string; newsCount: number; topicsCount: number; fields: string[] }[];
  isDefault: boolean;
}) {
  const filtered = filterBySource(allExports, source);
  const filteredDates = allDates.filter((d) =>
    filtered.some((e) => e.date === d.date)
  );

  const isGov = source === "gov";
  const sectionId = `source-${source}`;

  return (
    <div
      id={sectionId}
      data-source={source}
      style={isDefault ? undefined : { display: "none" }}
    >
      {/* Hero 区 */}
      <section className="page-hero">
        <h1>
          {isGov
            ? "中国政府网 · 经济学论文选题"
            : "新闻联播 · 经济学论文选题"}
        </h1>
        <p></p>
      </section>

      <div className="content-layout">
        <div className="sidebar-column">
          <DateSidebar dates={filteredDates} />
        </div>

        <div className="content-main">
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
            <div
              key={`${daily.date}-${source}`}
              className="date-section"
            >
              <div className="date-heading">
                <h2 style={{ margin: 0 }}>
                  <Link
                    href={`/date/${daily.date}`}
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    {daily.date}
                  </Link>
                </h2>
                <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                  {daily.newsCount} 条新闻 · {daily.topicsCount} 个选题
                </span>
              </div>

              {daily.news.map((news) => (
                <NewsCard
                  key={news.slug}
                  news={news}
                  date={daily.date}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const allExports = getAllGroupedByDate();
  const allDates = getAllDates();

  return (
    <>
      {/* 双源切换标签 — 客户端组件，点击切换两个 SourceSection 的显示 */}
      <div style={{ textAlign: "center", paddingTop: "0.5rem" }}>
        <SourceTabs active="gov" />
      </div>

      {/* gov 默认可视，cctv 默认隐藏 */}
      <SourceSection
        source="gov"
        exports={allExports}
        allDates={allDates}
        isDefault={true}
      />
      <SourceSection
        source="cctv"
        exports={allExports}
        allDates={allDates}
        isDefault={false}
      />
    </>
  );
}

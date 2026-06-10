/**
 * 首页 — 全量服务端渲染，CSS 驱动双源切换
 * 所有内容均在构建时生成到 HTML，无需客户端 JS 即可显示
 * 仅用 120 字节内联脚本处理 ?source= URL 参数
 */
import Link from "next/link";
import { getAllGroupedByDate, getAllDates } from "@/lib/data";
import { NewsCard } from "@/components/NewsCard";
import { DateSidebar } from "@/components/DateSidebar";
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
        <div className="source-tabs">
          <a
            href="#source-gov"
            className={`source-tab${isGov ? " active" : ""}`}
            data-source="gov"
          >
            🇨🇳 中国政府网
          </a>
          <a
            href="#source-cctv"
            className={`source-tab${!isGov ? " active" : ""}`}
            data-source="cctv"
          >
            📺 新闻联播
          </a>
        </div>
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
      {/* CSS-only tab switching + URL param support — 内联零依赖 */}
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){var p=new URLSearchParams(location.search);var s=p.get('source')==='cctv'?'cctv':'gov';var a=document.getElementById('source-'+s);var b=document.getElementById('source-'+(s==='gov'?'cctv':'gov'));if(a)a.style.display='';if(b)b.style.display='none';var t=document.querySelectorAll('.source-tab[data-source='+s+']');for(var i=0;i<t.length;i++)t[i].classList.add('active');var o=document.querySelectorAll('.source-tab[data-source='+(s==='gov'?'cctv':'gov')+']');for(var i=0;i<o.length;i++)o[i].classList.remove('active');})()`,
        }}
      />
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
      {/* 锚点 Tab 点击切换 — 纯 CSS anchor 降级 */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.querySelectorAll('.source-tab').forEach(function(t){t.addEventListener('click',function(e){var s=this.dataset.source;var a=document.getElementById('source-'+s);var b=document.getElementById('source-'+(s==='gov'?'cctv':'gov'));if(a)a.style.display='';if(b)b.style.display='none';var url=new URL(location);url.searchParams.set('source',s);history.replaceState(null,'',url);e.preventDefault()})})`,
        }}
      />
    </>
  );
}

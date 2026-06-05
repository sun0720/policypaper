/**
 * 首页 — 按日期降序展示最新经济学论文选题
 */
import { getAllDates, getAllFields, getByDate } from "@/lib/data";
import { FilterBar } from "@/components/FilterBar";
import { NewsCard } from "@/components/NewsCard";

export default function HomePage() {
  const dates = getAllDates();
  const fields = getAllFields();

  return (
    <>
      {/* Hero 区域 */}
      <section className="page-hero">
        <h1>经济学论文选题</h1>
        <p style={{ color: "var(--muted)", fontSize: "1rem", lineHeight: 1.7, maxWidth: "60ch" }}>
          每日 AI 分析中国政府网经济新闻，从新古典、凯恩斯、行为经济学、制度经济学、发展经济学等多元视角生成差异化论文选题，为经济学研究者提供选题灵感。
        </p>
      </section>

      <FilterBar fields={fields} />

      {/* 按日期分组 */}
      <section>
        {dates.length === 0 && (
          <p style={{ color: "var(--muted)", textAlign: "center", padding: "3rem 0" }}>
            暂无数据。请先运行 paper-topic-analyzer 生成论文选题。
          </p>
        )}

        {dates.map((dateInfo) => {
          const daily = getByDate(dateInfo.date);
          if (!daily || daily.news.length === 0) return null;

          return (
            <div key={dateInfo.date} className="date-section">
              {/* 日期标题 */}
              <div className="date-heading">
                <h2 style={{ margin: 0 }}>
                  <a href={`/date/${dateInfo.date}`} style={{ color: "inherit", textDecoration: "none" }}>
                    📅 {dateInfo.date}
                  </a>
                </h2>
                <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                  {dateInfo.newsCount} 条新闻 · {dateInfo.topicsCount} 个选题
                </span>
              </div>

              {daily.news.map((news) => (
                <NewsCard key={news.slug} news={news} date={dateInfo.date} />
              ))}
            </div>
          );
        })}
      </section>
    </>
  );
}

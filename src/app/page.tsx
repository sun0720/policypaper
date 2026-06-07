/**
 * 首页 — 按日期降序展示最新经济学论文选题
 */
import { getAllDates, getByDate } from "@/lib/data";
import { NewsCard } from "@/components/NewsCard";
import { DateSidebar } from "@/components/DateSidebar";

export default function HomePage() {
  const dates = getAllDates();

  return (
    <>
      {/* Hero 区域：横跨全宽 */}
      <section className="page-hero">
        <h1>经济学论文选题</h1>
        <p>
          依据中国政府网的经济新闻，寻找相关的经济学论文选题，为经济学研究者提高选题灵感
        </p>
      </section>

      <div className="content-layout">
        {/* 左侧：日期导航 */}
        <div className="sidebar-column">
          <DateSidebar dates={dates} />
        </div>

        {/* 右侧：主内容 */}
        <div className="content-main">
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
                  <div className="date-heading">
                    <h2 style={{ margin: 0 }}>
                      <a href={`/date/${dateInfo.date}`} style={{ color: "inherit", textDecoration: "none" }}>
                        {dateInfo.date}
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
        </div>
      </div>
    </>
  );
}

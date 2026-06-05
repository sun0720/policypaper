/**
 * 归档页 — 按年月分组展示
 */
import type { Metadata } from "next";
import { getArchiveData } from "@/lib/data";
import { Breadcrumb } from "@/components/Breadcrumb";

export const metadata: Metadata = {
  title: "归档 | EconTopic",
  description: "按月份浏览经济学论文选题归档",
};

export default function ArchivePage() {
  const archive = getArchiveData();
  const sortedMonths = Array.from(archive.keys()).sort().reverse();

  return (
    <>
      <Breadcrumb items={[{ label: "首页", href: "/" }, { label: "归档" }]} />

      <header style={{ marginBottom: "2rem" }}>
        <h1>📚 选题归档</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
          按月份浏览全部历史经济学论文选题
        </p>
      </header>

      {sortedMonths.length === 0 && (
        <p style={{ color: "var(--muted)", textAlign: "center", padding: "3rem 0" }}>
          暂无归档数据
        </p>
      )}

      {sortedMonths.map((month) => {
        const exports = archive.get(month)!;
        const totalNews = exports.reduce((s, e) => s + e.newsCount, 0);
        const totalTopics = exports.reduce((s, e) => s + e.topicsCount, 0);

        const [year, m] = month.split("-");
        const monthLabel = `${year}年${parseInt(m)}月`;

        return (
          <section key={month} className="date-section">
            <h2 style={{ marginBottom: "0.5rem", paddingBottom: "0.4rem", borderBottom: "2px solid var(--divider)" }}>
              {monthLabel}
              <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "var(--muted)", marginLeft: "0.75rem" }}>
                {totalNews} 条新闻 · {totalTopics} 个选题
              </span>
            </h2>

            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {exports.map((exp) => (
                <li key={exp.date} style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border)" }}>
                  <a
                    href={`/date/${exp.date}`}
                    style={{
                      color: "var(--foreground)",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "baseline",
                      gap: "0.75rem",
                    }}
                  >
                    <span style={{ fontFamily: "'STSong','Songti SC','Noto Serif SC',Georgia,serif", fontSize: "1.05rem", fontWeight: 500 }}>
                      📅 {exp.date}
                    </span>
                    <span style={{ fontSize: "0.85rem", color: "var(--muted)" }}>
                      {exp.newsCount} 条新闻 · {exp.topicsCount} 个选题
                    </span>
                    <span style={{ fontSize: "0.8rem", color: "var(--muted)", marginLeft: "auto" }}>
                      {exp.fields.slice(0, 3).join(" · ")}
                      {exp.fields.length > 3 ? " …" : ""}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

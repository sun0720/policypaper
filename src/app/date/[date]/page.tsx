/**
 * 日期页 — 展示某一天的所有新闻及选题详情
 * 路由：/date/2026-06-04
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getByDate, getAllDates } from "@/lib/data";
import { Breadcrumb } from "@/components/Breadcrumb";
import { NewsCard } from "@/components/NewsCard";

interface Props {
  params: Promise<{ date: string }>;
}

export async function generateStaticParams() {
  const dates = getAllDates();
  return dates.map((d) => ({ date: d.date }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { date } = await params;
  return {
    title: `${date} 论文选题 | EconTopic`,
    description: `${date} 经济学论文选题，涵盖多视角研究方向`,
  };
}

export default async function DatePage({ params }: Props) {
  const { date } = await params;
  const daily = getByDate(date);

  if (!daily || daily.news.length === 0) notFound();

  return (
    <>
      <Breadcrumb items={[{ label: "首页", href: "/" }, { label: date }]} />

      <header style={{ marginBottom: "2rem" }}>
        <h1>{date}</h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", fontSize: "0.9rem", color: "var(--muted)" }}>
          <span><strong>{daily.newsCount}</strong> 条经济新闻</span>
          <span><strong>{daily.topicsCount}</strong> 个论文选题</span>
          <span>覆盖：{daily.fields.join(" · ")}</span>
        </div>
      </header>

      <section>
        {daily.news.map((news) => (
          <NewsCard key={news.slug} news={news} date={date} />
        ))}
      </section>
    </>
  );
}

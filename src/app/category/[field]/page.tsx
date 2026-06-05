/**
 * 分类页 — 按经济领域筛选新闻及选题
 * 路由：/category/[field]
 */
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getByField, getAllFields } from "@/lib/data";
import { Breadcrumb } from "@/components/Breadcrumb";
import { FilterBar } from "@/components/FilterBar";
import { NewsCard } from "@/components/NewsCard";

interface Props {
  params: Promise<{ field: string }>;
}

export function generateStaticParams() {
  // 已知经济领域列表（与 data/exports 中的数据对应）
  return [
    "🏭 产业经济 — 消费与服务业",
    "🌏 国际贸易与对外经济 — 自贸区与开放平台",
    "🏭 产业经济 — 房地产与基建",
    "🏭 产业经济 — 物流与交通",
  ].map((f) => ({ field: encodeURIComponent(f) }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { field } = await params;
  return {
    title: `${decodeURIComponent(field)} 论文选题 | EconTopic`,
    description: `${decodeURIComponent(field)} 领域经济学论文选题`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { field } = await params;
  const allFields = getAllFields();

  const matchedField = allFields.find(
    (f) => encodeURIComponent(f) === field
  );

  if (!matchedField) notFound();

  const results = getByField(matchedField);
  if (results.length === 0) notFound();

  const groupedByDate = new Map<string, typeof results>();
  for (const r of results) {
    if (!groupedByDate.has(r.date)) groupedByDate.set(r.date, []);
    groupedByDate.get(r.date)!.push(r);
  }
  const sortedDates = Array.from(groupedByDate.keys()).sort().reverse();

  return (
    <>
      <Breadcrumb items={[{ label: "首页", href: "/" }, { label: matchedField }]} />

      <header style={{ marginBottom: "1.5rem" }}>
        <h1>{matchedField}</h1>
        <p style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
          共 {results.length} 条新闻 ·{" "}
          {results.reduce((sum, r) => sum + r.news.topics.length, 0)} 个选题
        </p>
      </header>

      <FilterBar fields={allFields} activeField={matchedField} />

      {sortedDates.map((date) => {
        const items = groupedByDate.get(date)!;
        return (
          <div key={date} className="date-section">
            <div className="date-heading">
              <h2 style={{ margin: 0 }}>
                <a href={`/date/${date}`} style={{ color: "inherit", textDecoration: "none" }}>
                  📅 {date}
                </a>
              </h2>
            </div>
            {items.map(({ news }) => (
              <NewsCard key={news.slug} news={news} date={date} />
            ))}
          </div>
        );
      })}
    </>
  );
}

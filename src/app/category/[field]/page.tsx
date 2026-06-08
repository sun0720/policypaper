/**
 * 分类页 — 按经济领域筛选新闻及选题
 * 路由：/category/[field]
 */
import Link from "next/link";
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
  return getAllFields().map((field) => ({ field: encodeURIComponent(field) }));
}

function decodeFieldParam(field: string): string {
  try {
    return decodeURIComponent(field);
  } catch {
    return field;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { field } = await params;
  const decodedField = decodeFieldParam(field);
  return {
    title: `${decodedField} 论文选题 | EconTopic`,
    description: `${decodedField} 领域经济学论文选题`,
  };
}

export default async function CategoryPage({ params }: Props) {
  const { field } = await params;
  const allFields = getAllFields();
  const decodedField = decodeFieldParam(field);

  const matchedField = allFields.find(
    (f) => f === decodedField || encodeURIComponent(f) === field
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
                <Link href={`/date/${date}`} style={{ color: "inherit", textDecoration: "none" }}>
                  {date}
                </Link>
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

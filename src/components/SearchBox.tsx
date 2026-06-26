"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { SearchIndexItem } from "@/lib/data";

interface SearchBoxProps {
  items: SearchIndexItem[];
}

function normalizeQuery(query: string): string[] {
  return query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function getMatchType(item: SearchIndexItem, terms: string[]): string {
  const matchedTopics = item.topics.filter((topic) => {
    const text = `${topic.title} ${topic.perspective} ${topic.researchQuestion}`.toLowerCase();
    return terms.every((term) => text.includes(term));
  });

  if (matchedTopics.length > 0) return `匹配 ${matchedTopics.length} 个论文选题`;
  if (terms.every((term) => item.title.toLowerCase().includes(term))) return "匹配新闻标题";
  if (terms.every((term) => `${item.economicField} ${item.subField}`.toLowerCase().includes(term))) {
    return "匹配经济领域";
  }
  return "匹配新闻正文";
}

function scoreItem(item: SearchIndexItem, terms: string[]): number {
  const title = item.title.toLowerCase();
  const field = `${item.economicField} ${item.subField}`.toLowerCase();
  const topicTitles = item.topics.map((topic) => topic.title.toLowerCase()).join(" ");

  return terms.reduce((score, term) => {
    if (title.includes(term)) score += 8;
    if (topicTitles.includes(term)) score += 6;
    if (field.includes(term)) score += 4;
    if (item.searchText.includes(term)) score += 1;
    return score;
  }, 0);
}

export function SearchBox({ items }: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const terms = useMemo(() => normalizeQuery(query), [query]);

  const results = useMemo(() => {
    if (terms.length === 0) return [];

    return items
      .filter((item) => terms.every((term) => item.searchText.includes(term)))
      .map((item) => ({
        item,
        score: scoreItem(item, terms),
        matchType: getMatchType(item, terms),
      }))
      .sort((a, b) => b.score - a.score || b.item.date.localeCompare(a.item.date))
      .slice(0, 12);
  }, [items, terms]);

  const hasQuery = terms.length > 0;

  return (
    <section className="home-search" aria-label="站内搜索">
      <div className="home-search-field">
        <span className="home-search-icon" aria-hidden="true">
          🔎
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="搜索新闻、论文选题、经济领域或研究方法"
          aria-label="搜索新闻和论文选题"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="清空搜索">
            清空
          </button>
        )}
      </div>

      {hasQuery && (
        <div className="home-search-results" role="region" aria-live="polite">
          <div className="home-search-summary">
            {results.length > 0
              ? `找到 ${results.length} 条相关结果`
              : "没有找到相关结果"}
          </div>

          {results.length > 0 && (
            <div className="home-search-list">
              {results.map(({ item, matchType }) => (
                <article className="home-search-result" key={item.slug}>
                  <div className="home-search-result-meta">
                    <span>{item.date}</span>
                    <span>{item.sourceLabel}</span>
                    <span>{matchType}</span>
                  </div>
                  <h2>
                    <Link href={`/news/${item.slug}`}>{item.title}</Link>
                  </h2>
                  <p>{item.excerpt}{item.excerpt.length >= 180 ? "..." : ""}</p>
                  <div className="home-search-topic-list">
                    {item.topics.slice(0, 3).map((topic) => (
                      <Link href={`/news/${item.slug}#topic-${topic.sortOrder}`} key={topic.sortOrder}>
                        {topic.sortOrder}. {topic.title}
                      </Link>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

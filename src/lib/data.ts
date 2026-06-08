/**
 * 数据访问层 — 从 data/exports/*.md 读取并缓存
 * MVP 方案：无需数据库，Server Components 直接调用 fs
 * 构建时一次性读取所有数据并建立索引，后续查询均为 O(1)
 */

import fs from "fs";
import path from "path";
import { parseDailyExport, type DailyExport, type NewsData, type TopicData } from "./parser";

const EXPORTS_DIR = path.join(process.cwd(), "data", "exports");

// ---- 索引结构 ----

/** 按日期索引 */
let _byDate: Map<string, DailyExport> | null = null;
/** 按 slug 索引新闻 */
let _bySlug: Map<string, { news: NewsData; date: string }> | null = null;
/** 按经济领域索引 */
let _byField: Map<string, { news: NewsData; date: string }[]> | null = null;
/** 全部导出列表（日期 DESC） */
let _all: DailyExport[] | null = null;

function getNewsFieldLabel(news: NewsData): string {
  return news.subField ? `${news.economicField} — ${news.subField}` : news.economicField;
}

/** 一次性加载并建立所有索引 */
function ensureLoaded(): void {
  if (_all !== null) return;

  const exports: DailyExport[] = [];
  const byDate = new Map<string, DailyExport>();
  const bySlug = new Map<string, { news: NewsData; date: string }>();
  const byField = new Map<string, { news: NewsData; date: string }[]>();

  if (fs.existsSync(EXPORTS_DIR)) {
    const files = fs
      .readdirSync(EXPORTS_DIR)
      .filter((f) => f.endsWith("-paper-topics.md"))
      .sort()
      .reverse(); // 最新在前

    for (const file of files) {
      const content = fs.readFileSync(path.join(EXPORTS_DIR, file), "utf-8");
      const parsed = parseDailyExport(content);
      if (!parsed) continue;

      exports.push(parsed);
      byDate.set(parsed.date, parsed);

      for (const news of parsed.news) {
        bySlug.set(news.slug, { news, date: parsed.date });

        const field = getNewsFieldLabel(news);
        if (field) {
          if (!byField.has(field)) byField.set(field, []);
          byField.get(field)!.push({ news, date: parsed.date });
        }
      }
    }
  }

  _all = exports;
  _byDate = byDate;
  _bySlug = bySlug;
  _byField = byField;
}

// ---- 查询函数 ----

/** 按日期降序获取所有日期的简要信息 */
export function getAllDates(): { date: string; newsCount: number; topicsCount: number; fields: string[] }[] {
  ensureLoaded();
  return _all!.map((e) => ({
    date: e.date,
    newsCount: e.newsCount,
    topicsCount: e.topicsCount,
    fields: e.fields,
  }));
}

/** 获取指定日期的完整数据 */
export function getByDate(date: string): DailyExport | undefined {
  ensureLoaded();
  return _byDate!.get(date);
}

/** 通过 slug 查找新闻及其所在日期 — O(1) */
export function getNewsBySlug(slug: string): { news: NewsData; date: string } | undefined {
  ensureLoaded();
  return _bySlug!.get(slug);
}

/** 获取所有不重复的经济领域 */
export function getAllFields(): string[] {
  ensureLoaded();
  return Array.from(_byField!.keys()).sort();
}

/** 按经济领域筛选新闻 — O(1) */
export function getByField(field: string): { news: NewsData; date: string }[] {
  ensureLoaded();
  return _byField!.get(field) ?? [];
}

/** 扁平化获取所有选题（按日期 DESC） */
export function getAllTopics(): { topic: TopicData; news: NewsData; date: string }[] {
  ensureLoaded();
  const results: { topic: TopicData; news: NewsData; date: string }[] = [];
  for (const exp of _all!) {
    for (const news of exp.news) {
      for (const topic of news.topics) {
        results.push({ topic, news, date: exp.date });
      }
    }
  }
  return results;
}

/** 获取所有日期-新闻数据（用于首页渲染） */
export function getAllGroupedByDate(): DailyExport[] {
  ensureLoaded();
  return _all!;
}

/**
 * 按月份分组用于归档页
 * 返回 Map<"2026-06", DailyExport[]>
 */
export function getArchiveData(): Map<string, DailyExport[]> {
  ensureLoaded();
  const grouped = new Map<string, DailyExport[]>();
  for (const exp of _all!) {
    const month = exp.date.slice(0, 7); // YYYY-MM
    if (!grouped.has(month)) grouped.set(month, []);
    grouped.get(month)!.push(exp);
  }
  return grouped;
}

/** 强制刷新缓存（开发调试用） */
export function clearCache(): void {
  _all = null;
  _byDate = null;
  _bySlug = null;
  _byField = null;
}

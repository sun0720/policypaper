/**
 * 数据访问层 — 从 data/exports/*.md 读取并缓存
 * MVP 方案：无需数据库，Server Components 直接调用 fs
 */

import fs from "fs";
import path from "path";
import { parseDailyExport, type DailyExport, type NewsData, type TopicData } from "./parser";

const EXPORTS_DIR = path.join(process.cwd(), "data", "exports");

/** 内存缓存：避免每次请求都重新解析文件 */
let _cache: { exports: DailyExport[]; ts: number } | null = null;
const CACHE_TTL = 60_000; // 1 分钟

function getNewsFieldLabel(news: NewsData): string {
  return news.subField ? `${news.economicField} — ${news.subField}` : news.economicField;
}

/** 获取所有已解析的每日导出数据（带缓存） */
function getAllExports(): DailyExport[] {
  const now = Date.now();
  if (_cache && now - _cache.ts < CACHE_TTL) {
    return _cache.exports;
  }

  const exports: DailyExport[] = [];
  if (!fs.existsSync(EXPORTS_DIR)) {
    _cache = { exports, ts: now };
    return exports;
  }

  const files = fs
    .readdirSync(EXPORTS_DIR)
    .filter((f) => f.endsWith("-paper-topics.md"))
    .sort()
    .reverse(); // 最新在前

  for (const file of files) {
    const content = fs.readFileSync(path.join(EXPORTS_DIR, file), "utf-8");
    const parsed = parseDailyExport(content);
    if (parsed) exports.push(parsed);
  }

  _cache = { exports, ts: now };
  return exports;
}

// ---- 查询函数 ----

/** 按日期降序获取所有日期的简要信息 */
export function getAllDates(): { date: string; newsCount: number; topicsCount: number; fields: string[] }[] {
  return getAllExports().map((e) => ({
    date: e.date,
    newsCount: e.newsCount,
    topicsCount: e.topicsCount,
    fields: e.fields,
  }));
}

/** 获取指定日期的完整数据 */
export function getByDate(date: string): DailyExport | undefined {
  return getAllExports().find((e) => e.date === date);
}

/** 通过 slug 查找新闻及其所在日期 */
export function getNewsBySlug(slug: string): { news: NewsData; date: string } | undefined {
  for (const exp of getAllExports()) {
    const news = exp.news.find((n) => n.slug === slug);
    if (news) return { news, date: exp.date };
  }
  return undefined;
}

/** 获取所有不重复的经济领域 */
export function getAllFields(): string[] {
  const fieldSet = new Set<string>();
  for (const exp of getAllExports()) {
    for (const news of exp.news) {
      const field = getNewsFieldLabel(news);
      if (field) fieldSet.add(field);
    }
  }
  return Array.from(fieldSet).sort();
}

/** 按经济领域筛选新闻 */
export function getByField(field: string): { news: NewsData; date: string }[] {
  const results: { news: NewsData; date: string }[] = [];
  for (const exp of getAllExports()) {
    for (const news of exp.news) {
      if (getNewsFieldLabel(news) === field) {
        results.push({ news, date: exp.date });
      }
    }
  }
  return results;
}

/** 扁平化获取所有选题（按日期 DESC） */
export function getAllTopics(): { topic: TopicData; news: NewsData; date: string }[] {
  const results: { topic: TopicData; news: NewsData; date: string }[] = [];
  for (const exp of getAllExports()) {
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
  return getAllExports();
}

/**
 * 按月份分组用于归档页
 * 返回 Map<"2026-06", DailyExport[]>
 */
export function getArchiveData(): Map<string, DailyExport[]> {
  const grouped = new Map<string, DailyExport[]>();
  for (const exp of getAllExports()) {
    const month = exp.date.slice(0, 7); // YYYY-MM
    if (!grouped.has(month)) grouped.set(month, []);
    grouped.get(month)!.push(exp);
  }
  return grouped;
}

/** 强制刷新缓存（开发调试用） */
export function clearCache(): void {
  _cache = null;
}

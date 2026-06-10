/**
 * 数据访问层 — 从 data/exports/gov/ 和 data/exports/cctv/ 读取并缓存
 * MVP 方案：无需数据库，Server Components 直接调用 fs
 * 构建时一次性读取所有数据并建立索引，后续查询均为 O(1)
 *
 * 双源架构：gov（中国政府网） + cctv（新闻联播）
 * 每篇新闻通过 source 字段标记来源，合并索引后统一查询
 *
 * 🚀 性能优化：
 * - 构建时自动生成 JSON 缓存（data/.cache/parsed.json），避免重复 regex 解析
 * - 缓存基于源文件 mtime 自动失效，确保数据一致
 * - 索引结构：byDate (O(1)), bySlug (O(1)), byField (O(1)), bySource (O(1))
 */

import fs from "fs";
import path from "path";
import { parseDailyExport, type DailyExport, type NewsData, type TopicData } from "./parser";

/** 数据源定义 */
type DataSource = 'gov' | 'cctv';
const SOURCES: DataSource[] = ['gov', 'cctv'];

const EXPORTS_BASE = path.join(process.cwd(), "data", "exports");
const CACHE_DIR = path.join(process.cwd(), "data", ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "parsed.json");

// ---- 索引结构 ----

/** 按日期+来源组合键索引 */
let _byDate: Map<string, DailyExport> | null = null;
/** 按 slug 索引新闻 */
let _bySlug: Map<string, { news: NewsData; date: string }> | null = null;
/** 按经济领域索引 */
let _byField: Map<string, { news: NewsData; date: string }[]> | null = null;
/** 按来源索引 */
let _bySource: Map<DataSource, DailyExport[]> | null = null;
/** 全部导出列表（日期 DESC） */
let _all: DailyExport[] | null = null;

function getNewsFieldLabel(news: NewsData): string {
  return news.subField ? `${news.economicField} — ${news.subField}` : news.economicField;
}

/** 组合日期+来源作为唯一键 */
function dateSourceKey(date: string, source: string): string {
  return `${date}|${source}`;
}

// ═══════════════════════════════════════════════════════════
// JSON 缓存层 — 避免每次构建重复 regex 解析（~10x 提速）
// ═══════════════════════════════════════════════════════════

/** 递归收集所有源文件（含子目录） */
function collectExportFiles(): { filePath: string; source: DataSource }[] {
  const results: { filePath: string; source: DataSource }[] = [];
  if (!fs.existsSync(EXPORTS_BASE)) return results;

  for (const source of SOURCES) {
    const sourceDir = path.join(EXPORTS_BASE, source);
    if (!fs.existsSync(sourceDir)) continue;
    const files = fs.readdirSync(sourceDir).filter((f) => f.endsWith("-paper-topics.md"));
    for (const file of files) {
      results.push({ filePath: path.join(sourceDir, file), source });
    }
  }
  return results;
}

/** 检查缓存是否有效（所有源文件的 mtime 都早于缓存文件） */
function isCacheFresh(): boolean {
  try {
    if (!fs.existsSync(CACHE_FILE)) return false;
    const cacheStat = fs.statSync(CACHE_FILE);
    const cacheTime = cacheStat.mtimeMs;

    const exportFiles = collectExportFiles();
    if (exportFiles.length === 0) return true; // 无源文件，缓存有效

    for (const { filePath } of exportFiles) {
      const fileStat = fs.statSync(filePath);
      if (fileStat.mtimeMs > cacheTime) return false; // 源文件比缓存新
    }
    return true;
  } catch {
    return false;
  }
}

/** 从 JSON 缓存加载（快路径，跳过 regex 解析） */
function loadFromCache(): boolean {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    const cached: { all: DailyExport[] } = JSON.parse(raw);

    const exports = cached.all;
    const byDate = new Map<string, DailyExport>();
    const bySlug = new Map<string, { news: NewsData; date: string }>();
    const byField = new Map<string, { news: NewsData; date: string }[]>();
    const bySource = new Map<DataSource, DailyExport[]>();

    for (const exp of exports) {
      const key = dateSourceKey(exp.date, exp.source || 'gov');
      byDate.set(key, exp);

      // 按来源分组
      const src = (exp.source || 'gov') as DataSource;
      if (!bySource.has(src)) bySource.set(src, []);
      bySource.get(src)!.push(exp);

      for (const news of exp.news) {
        bySlug.set(news.slug, { news, date: exp.date });
        const field = getNewsFieldLabel(news);
        if (field) {
          if (!byField.has(field)) byField.set(field, []);
          byField.get(field)!.push({ news, date: exp.date });
        }
      }
    }

    _all = exports;
    _byDate = byDate;
    _bySlug = bySlug;
    _byField = byField;
    _bySource = bySource;
    return true;
  } catch {
    return false;
  }
}

/** 将已解析数据写入 JSON 缓存 */
function saveToCache(exports: DailyExport[]): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ all: exports }), "utf-8");
  } catch {
    // 缓存写入失败不影响正常运行（权限不足等场景）
  }
}

/** 一次性加载并建立所有索引 */
function ensureLoaded(): void {
  if (_all !== null) return;

  // 快路径：读取 JSON 缓存（~10x 快于 regex 解析）
  if (isCacheFresh() && loadFromCache()) return;

  // 慢路径：完整解析所有 Markdown 文件
  const exports: DailyExport[] = [];
  const byDate = new Map<string, DailyExport>();
  const bySlug = new Map<string, { news: NewsData; date: string }>();
  const byField = new Map<string, { news: NewsData; date: string }[]>();
  const bySource = new Map<DataSource, DailyExport[]>();

  const exportFiles = collectExportFiles();
  // 按日期降序排列（最新在前）
  exportFiles.sort((a, b) => b.filePath.localeCompare(a.filePath));

  for (const { filePath, source } of exportFiles) {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = parseDailyExport(content);
    if (!parsed) continue;

    // 标记来源
    parsed.source = source;
    for (const news of parsed.news) {
      news.source = source;
    }

    exports.push(parsed);
    const key = dateSourceKey(parsed.date, source);
    byDate.set(key, parsed);

    // 按来源分组
    if (!bySource.has(source)) bySource.set(source, []);
    bySource.get(source)!.push(parsed);

    for (const news of parsed.news) {
      bySlug.set(news.slug, { news, date: parsed.date });

      const field = getNewsFieldLabel(news);
      if (field) {
        if (!byField.has(field)) byField.set(field, []);
        byField.get(field)!.push({ news, date: parsed.date });
      }
    }
  }

  _all = exports;
  _byDate = byDate;
  _bySlug = bySlug;
  _byField = byField;
  _bySource = bySource;

  // 构建完成后写入缓存，下次构建直接命中
  saveToCache(exports);
}

// ═══════════════════════════════════════════════════════════
// 合并工具 — 双源同日期数据合并为单一 DailyExport
// ═══════════════════════════════════════════════════════════

/** 合并同日期的多个 DailyExport（来自不同数据源）为一个 */
function mergeExports(exports: DailyExport[]): DailyExport {
  if (exports.length === 0) {
    return { date: "", fields: [], newsCount: 0, topicsCount: 0, generatedAt: "", news: [] };
  }
  if (exports.length === 1) return exports[0];

  const first = exports[0];
  const allNews = exports.flatMap((e) => e.news);
  const allFields = [...new Set(exports.flatMap((e) => e.fields))];
  const totalTopics = allNews.reduce((sum, n) => sum + n.topics.length, 0);

  return {
    date: first.date,
    fields: allFields,
    newsCount: allNews.length,
    topicsCount: totalTopics,
    generatedAt: first.generatedAt,
    news: allNews,
  };
}

/** 懒加载：按日期合并的 DailyExport 映射 */
let _mergedByDate: Map<string, DailyExport> | null = null;

function ensureMerged(): Map<string, DailyExport> {
  if (_mergedByDate !== null) return _mergedByDate;

  ensureLoaded();
  _mergedByDate = new Map<string, DailyExport>();

  // 将同日期的多源数据分组
  const groups = new Map<string, DailyExport[]>();
  for (const exp of _all!) {
    if (!groups.has(exp.date)) groups.set(exp.date, []);
    groups.get(exp.date)!.push(exp);
  }

  // 合并每组
  for (const [date, exps] of groups) {
    _mergedByDate.set(date, mergeExports(exps));
  }

  return _mergedByDate;
}

// ---- 查询函数 ----

/** 按日期降序获取所有日期的简要信息（双源合并） */
export function getAllDates(): { date: string; newsCount: number; topicsCount: number; fields: string[] }[] {
  const merged = ensureMerged();
  return Array.from(merged.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => ({
      date: e.date,
      newsCount: e.newsCount,
      topicsCount: e.topicsCount,
      fields: e.fields,
    }));
}

/** 获取指定日期的完整数据（双源合并） */
export function getByDate(date: string): DailyExport | undefined {
  return ensureMerged().get(date);
}

/** 获取指定日期+来源的原始数据（不合并） */
export function getByDateAndSource(date: string, source: DataSource): DailyExport | undefined {
  ensureLoaded();
  return _byDate!.get(dateSourceKey(date, source));
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

/** 按数据来源获取所有导出 */
export function getBySource(source: DataSource): DailyExport[] {
  ensureLoaded();
  return _bySource!.get(source) ?? [];
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

/** 获取所有日期-新闻数据（双源合并，按日期 DESC，用于首页渲染） */
export function getAllGroupedByDate(): DailyExport[] {
  const merged = ensureMerged();
  return Array.from(merged.values()).sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * 按月份分组用于归档页（双源合并）
 * 返回 Map<"2026-06", DailyExport[]>
 */
export function getArchiveData(): Map<string, DailyExport[]> {
  const merged = ensureMerged();
  const grouped = new Map<string, DailyExport[]>();
  for (const exp of merged.values()) {
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
  _bySource = null;
  _mergedByDate = null;
}

/**
 * Markdown 论文选题解析器
 * 从 paper-topic-analyzer 产出的 .md 文件中提取结构化数据
 */

export interface TopicData {
  /** 选题序号 (1-5) */
  sortOrder: number;
  /** 经济学视角，如 "新古典视角" */
  perspective: string;
  /** 论文标题 */
  title: string;
  /** 研究问题 */
  researchQuestion: string;
  /** 理论框架 */
  theoreticalFramework: string;
  /** 研究方法 */
  methodology: string;
  /** 数据来源 */
  dataSources: string;
  /** 创新点 */
  innovation: string;
  /** 详细研究思路（🔬 研究思路 段落，5 个子节），可选 */
  researchApproach?: string;
}

export interface NewsData {
  /** 新闻标题 */
  title: string;
  /** 原文链接 */
  url: string;
  /** 发布日期 YYYY-MM-DD */
  date: string;
  /** 经济领域（含 emoji），如 "🏭 产业经济" */
  economicField: string;
  /** 子领域，如 "消费与服务业" */
  subField: string;
  /** 新闻正文全文 */
  content: string;
  /** 5 个论文选题 */
  topics: TopicData[];
  /** 生成的 slug，用于详情页路由 */
  slug: string;
}

export interface DailyExport {
  /** 导出日期 YYYY-MM-DD */
  date: string;
  /** 经济领域列表 */
  fields: string[];
  /** 新闻条数 */
  newsCount: number;
  /** 选题总数 */
  topicsCount: number;
  /** 生成时间 */
  generatedAt: string;
  /** 该日所有新闻 */
  news: NewsData[];
}

// ---------- helpers ----------

/** 去掉简单 YAML 字符串包裹符 */
function stripYamlString(value: string): string {
  return value.trim().replace(/^["'](.*)["']$/, "$1");
}

/** 解析 YAML inline array: [a, "b", c] */
function parseInlineArray(value: string): string[] {
  return value
    .slice(1, -1)
    .split(",")
    .map((s) => stripYamlString(s))
    .filter(Boolean);
}

/** 解析 YAML frontmatter（覆盖当前导出文件使用的简单格式） */
function parseFrontmatter(fm: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = fm.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;

    const key = match[1];
    const rawValue = match[2].trim();

    if (!rawValue) {
      const items: string[] = [];
      while (i + 1 < lines.length) {
        const itemMatch = lines[i + 1].trim().match(/^-\s+(.+)$/);
        if (!itemMatch) break;
        items.push(stripYamlString(itemMatch[1]));
        i++;
      }
      result[key] = items.length > 0 ? items : "";
      continue;
    }

    let value: unknown = stripYamlString(rawValue);
    if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
      value = parseInlineArray(value);
    }

    result[key] = value;
  }

  return result;
}

function hasLeadingEmoji(value: string): boolean {
  return /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u.test(value.trim());
}

/** 为无 emoji 的一级领域补充稳定视觉标识 */
function normalizeMainField(field: string): string {
  const clean = field.trim();
  if (!clean || hasLeadingEmoji(clean)) return clean;

  if (clean.includes("产业经济")) return `🏭 ${clean}`;
  if (clean.includes("国际贸易") || clean.includes("对外经济")) return `🌏 ${clean}`;
  if (clean.includes("宏观")) return `📊 ${clean}`;
  if (clean.includes("金融")) return `💰 ${clean}`;
  if (clean.includes("区域")) return `🏙 ${clean}`;

  return clean;
}

function formatFieldLabel(economicField: string, subField: string): string {
  return subField ? `${economicField} — ${subField}` : economicField;
}

/** 从 "🏭 产业经济 — 消费与服务业" 提取 field 和 subField */
function parseField(fieldText: string): { economicField: string; subField: string } {
  const clean = fieldText.replace(/\s+/g, " ").trim();
  const parts = clean.split("—").map((s) => s.trim()).filter(Boolean);
  const economicField = normalizeMainField(parts[0] || clean);
  const subField = parts.slice(1).join(" — ") || "";
  return { economicField, subField };
}

function normalizeFieldLabel(fieldText: string): string {
  const parsed = parseField(fieldText);
  return formatFieldLabel(parsed.economicField, parsed.subField);
}

/** 简单哈希函数 (djb2)，用于生成短 slug */
function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

/** 从新闻 URL 生成短 slug，避免中文编码后路径过长 */
function generateSlug(url: string): string {
  const govContentId = url.match(/content_(\d+)\.htm/);
  if (govContentId) return govContentId[1];

  return simpleHash(url).slice(0, 8);
}

/** 清理正文中的 HTML 片段和抓取残留 */
function sanitizeContent(raw: string): string {
  let cleaned = raw
    // 移除 HTML 标签
    .replace(/<[^>]*>/g, "")
    // 移除 HTML 实体
    .replace(/&[a-z]+;/gi, "")
    // 移除爬虫残留标记
    .replace(/UCAP-CONTENT"?>/gi, "");

  // ── 移除 gov.cn 网页抓取残留 ──

  // 1. 「我要纠错」及责任编辑行
  cleaned = cleaned.replace(/【我要纠错】.*/g, "");
  cleaned = cleaned.replace(/^\s*责任编辑[：:]\s*\S+\s*$/gm, "");

  // 2. 「相关稿件」及之后所有内容
  cleaned = cleaned.replace(/^\s*相关稿件[\s\S]*$/m, "");

  // 3. CSS 代码块：匹配包含 { ... } 的样式行
  cleaned = cleaned
    .replace(/^\s*\.[a-zA-Z_][\w-]*\s*\{/gm, "")    // .classname {
    .replace(/^\s*#\w[\w-]*\s*\{/gm, "")              // #id {
    .replace(/^\s*[a-z-]+\s*:\s*[^;]+;\s*$/gm, "")    // property: value;
    .replace(/^\s*\}\s*$/gm, "");                      // }

  // 4. gov.cn 页脚导航链接（含竖线分隔符的长行）
  cleaned = cleaned
    .replace(/^\s*(?:链接[：:]\s*)?(?:全国人大|全国政协|国家监察委员会?|最高人民法院|最高人民检察院|国务院|中国政府网)(?:\s*\|\s*(?:全国人大|全国政协|国家监察委员会?|最高人民法院|最高人民检察院|国务院|中国政府网))*\s*$/gm, "")
    .replace(/^\s*\|\s*$/gm, "");                     // 孤立的竖线

  // 5. 纯空白行压缩
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
}

/**
 * 从新闻正文中提取 📄 新闻正文 部分的内容
 * 格式：**📄 新闻正文**\n\n（内容）\n\n### 🎓 论文选题
 * 返回空字符串如果未找到内容段（向后兼容旧格式）
 */
function extractContent(body: string): string {
  const match = body.match(/\*\*📄\s*新闻正文\*\*\s*\n([\s\S]*?)(?=\n###\s*🎓\s*论文选题|$)/);
  if (!match) return "";
  return sanitizeContent(match[1]);
}

/** 提取 🔬 研究思路 段落（从 **🔬 研究思路** 到块末尾） */
function extractResearchApproach(block: string): string | undefined {
  const match = block.match(/\*\*🔬\s*研究思路\*\*\s*\n([\s\S]*)/);
  if (!match) return undefined;
  return match[1].trim() || undefined;
}

/** 解析选题 Markdown 表格中的一行 */
function extractTableValue(markdown: string, keyPattern: RegExp): string {
  const lines = markdown.split("\n");
  for (const line of lines) {
    const match = line.match(keyPattern);
    if (match) {
      // 表格行格式：| **key** | value |
      const pipeCount = (line.match(/\|/g) || []).length;
      if (pipeCount >= 2) {
        const cells = line.split("|").map((c) => c.trim());
        // cells[0] 空, cells[1] key, cells[2] value, cells[3] 空
        return cells[2] || "";
      }
    }
  }
  return "";
}

function stripLeadingTopicIcon(value: string): string {
  return value.replace(/^[\s\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]+/u, "").trim();
}

/** 解析单个选题块（#### ... 到下一个 #### 或 --- 或结束） */
function parseTopicBlock(block: string, order: number): TopicData | null {
  const lines = block.trim().split("\n");
  const headerLine = lines[0]?.trim() || "";

  // 支持 "1. ..." 和 "1.1 ..." 两种编号。
  const header = headerLine.replace(/^\d+(?:\.\d+)*\.?\s*/, "");
  const titleSeparator = header.match(/\s+—\s+/);
  if (!titleSeparator || titleSeparator.index === undefined) return null;

  const perspective = stripLeadingTopicIcon(header.slice(0, titleSeparator.index));
  const title = header.slice(titleSeparator.index + titleSeparator[0].length).trim();
  if (!perspective || !title) return null;

  return {
    sortOrder: order,
    perspective,
    title,
    researchQuestion: extractTableValue(block, /\*\*研究问题\*\*/),
    theoreticalFramework: extractTableValue(block, /\*\*理论框架\*\*/),
    methodology: extractTableValue(block, /\*\*研究方法\*\*/),
    dataSources: extractTableValue(block, /\*\*数据来源\*\*/),
    innovation: extractTableValue(block, /\*\*创新点\*\*/),
    researchApproach: extractResearchApproach(block),
  };
}

function normalizeNewsTitle(title: string): string {
  return title.replace(/^\d+\.\s*/, "").trim();
}

/** 解析单条新闻块 */
function parseNewsBlock(block: string, fallbackDate: string): NewsData | null {
  const lines = block.trim().split("\n");
  const title = normalizeNewsTitle(lines[0]?.trim() || "");
  if (!title) return null;

  let economicField = "";
  let subField = "";
  let date = fallbackDate;
  let url = "";

  // 提取 blockquote 元数据
  const body = lines.slice(1).join("\n");

  const fieldMatch = body.match(/^>\s*📂\s*\*{0,2}经济领域\*{0,2}\s*[：:]\s*(.+?)\s*$/m);
  if (fieldMatch) {
    const parsed = parseField(fieldMatch[1].trim());
    economicField = parsed.economicField;
    subField = parsed.subField;
  }

  const dateMatch = body.match(/^>\s*📅\s*\*{0,2}发布日期\*{0,2}\s*[：:]\s*(\d{4}-\d{2}-\d{2})/m);
  if (dateMatch) date = dateMatch[1];

  const urlMatch = body.match(
    /^>\s*🔗\s*\*{0,2}原文链接\*{0,2}\s*[：:]\s*(?:\[.*?\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/\S+))/m
  );
  if (urlMatch) url = urlMatch[1] || urlMatch[2] || "";

  // 提取新闻正文
  const content = extractContent(body);

  // 解析选题
  const topics: TopicData[] = [];
  // 按 #### 分割选题（跳过 ### 之前的内容）
  const topicSplit = body.split(/\n####\s+/);
  // 第一段是 ### 🎓 论文选题 之前的内容，跳过
  let order = 1;
  for (let i = 1; i < topicSplit.length; i++) {
    const topic = parseTopicBlock(topicSplit[i], order);
    if (topic) {
      topics.push(topic);
      order++;
    }
  }

  const slug = generateSlug(url || title);

  return { title, url, date, economicField, subField, content, topics, slug };
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function numberValue(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (value === undefined || value === null || value === "") continue;
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return undefined;
}

function uniqueValues(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

/** 解析完整的每日导出 .md 文件 */
export function parseDailyExport(markdown: string): DailyExport | null {
  // 分离 frontmatter
  const fmMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  const fm = fmMatch ? parseFrontmatter(fmMatch[1]) : {};

  const date = stringValue(fm.date);
  const generatedAt = stringValue(fm.generated_at);

  // 去掉 frontmatter 后的正文
  const body = markdown.replace(/^---\n[\s\S]*?\n---/, "").trim();

  // 按 ## 分割新闻（跳过 # 页面标题之后的第一个空块）
  const sections = body.split(/\n(?=##\s)/);
  // sections[0] 是页面标题 + 元数据 blockquote
  // sections[1..] 是各条新闻

  const news: NewsData[] = [];
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    // 去掉开头的 "## "
    const newsBody = section.replace(/^##\s+/, "");
    const parsed = parseNewsBlock(newsBody, date);
    if (parsed && parsed.topics.length > 0) {
      news.push(parsed);
    }
  }

  const fmFields = Array.isArray(fm.fields)
    ? fm.fields.map(String)
    : stringValue(fm.field)
      ? [stringValue(fm.field)]
      : [];
  const fieldsFromFrontmatter = fmFields.map(normalizeFieldLabel);
  const fieldsFromNews = news.map((n) => formatFieldLabel(n.economicField, n.subField));
  const fields = uniqueValues(fieldsFromFrontmatter.length > 0 ? fieldsFromFrontmatter : fieldsFromNews);

  const newsCount = numberValue(fm.news_count, fm.total_news) ?? news.length;
  const topicsCount =
    numberValue(fm.topics_count, fm.total_topics) ??
    news.reduce((sum, n) => sum + n.topics.length, 0);

  return { date, fields, newsCount, topicsCount, generatedAt, news };
}

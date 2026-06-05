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

/** 解析 YAML frontmatter（简单 KV 行） */
function parseFrontmatter(fm: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const line of fm.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;
    const key = trimmed.slice(0, colonIdx).trim();
    let value: unknown = trimmed.slice(colonIdx + 1).trim();
    // 数组 [a, b, c]
    if (typeof value === "string" && value.startsWith("[") && value.endsWith("]")) {
      value = value
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^"(.*)"$/, "$1"));
    }
    result[key] = value;
  }
  return result;
}

/** 从 "🏭 产业经济 — 消费与服务业" 提取 field 和 subField */
function parseField(fieldText: string): { economicField: string; subField: string } {
  const parts = fieldText.split("—").map((s) => s.trim());
  const economicField = parts[0] || fieldText;
  const subField = parts.slice(1).join(" — ") || "";
  return { economicField, subField };
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
  // 使用 URL 的哈希值作为 slug，短且唯一
  return simpleHash(url).slice(0, 8);
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

/** 解析单个选题块（#### ... 到下一个 #### 或 --- 或结束） */
function parseTopicBlock(block: string, order: number): TopicData | null {
  const lines = block.trim().split("\n");
  const headerLine = lines[0]?.trim() || "";

  // 解析 "N. 📊 新古典视角 — 论文标题"
  const headerMatch = headerLine.match(
    /^\d+\.\s*(?:[\p{Emoji_Presentation}\p{Extended_Pictographic}]\s*)?(.+?) — (.+)$/u
  );
  if (!headerMatch) {
    // 简化匹配：可能没有 emoji
    const simpleMatch = headerLine.match(/^\d+\.\s*(.+?) — (.+)$/);
    if (!simpleMatch) return null;
    return {
      sortOrder: order,
      perspective: simpleMatch[1].trim(),
      title: simpleMatch[2].trim(),
      researchQuestion: extractTableValue(block, /\*\*研究问题\*\*/),
      theoreticalFramework: extractTableValue(block, /\*\*理论框架\*\*/),
      methodology: extractTableValue(block, /\*\*研究方法\*\*/),
      dataSources: extractTableValue(block, /\*\*数据来源\*\*/),
      innovation: extractTableValue(block, /\*\*创新点\*\*/),
    };
  }

  return {
    sortOrder: order,
    perspective: headerMatch[1].trim(),
    title: headerMatch[2].trim(),
    researchQuestion: extractTableValue(block, /\*\*研究问题\*\*/),
    theoreticalFramework: extractTableValue(block, /\*\*理论框架\*\*/),
    methodology: extractTableValue(block, /\*\*研究方法\*\*/),
    dataSources: extractTableValue(block, /\*\*数据来源\*\*/),
    innovation: extractTableValue(block, /\*\*创新点\*\*/),
  };
}

/** 解析单条新闻块 */
function parseNewsBlock(block: string, fallbackDate: string): NewsData | null {
  const lines = block.trim().split("\n");
  const title = lines[0]?.trim() || "";
  if (!title) return null;

  let economicField = "";
  let subField = "";
  let date = fallbackDate;
  let url = "";

  // 提取 blockquote 元数据
  const body = lines.slice(1).join("\n");

  const fieldMatch = body.match(/📂\s*\*?\*?经济领域[：:]\s*(.+)/);
  if (fieldMatch) {
    const parsed = parseField(fieldMatch[1].trim());
    economicField = parsed.economicField;
    subField = parsed.subField;
  }

  const dateMatch = body.match(/📅\s*\*?\*?发布日期[：:]\s*(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) date = dateMatch[1];

  const urlMatch = body.match(/🔗\s*\*?\*?原文链接[：:]\s*\[.*?\]\((.+?)\)/);
  if (urlMatch) url = urlMatch[1];

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

  const slug = generateSlug(title);

  return { title, url, date, economicField, subField, topics, slug };
}

/** 解析完整的每日导出 .md 文件 */
export function parseDailyExport(markdown: string): DailyExport | null {
  // 分离 frontmatter
  const fmMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
  const fm = fmMatch ? parseFrontmatter(fmMatch[1]) : {};

  const date = String(fm.date || "");
  const fields = (Array.isArray(fm.fields) ? fm.fields : []) as string[];
  const newsCount = Number(fm.news_count || 0);
  const topicsCount = Number(fm.topics_count || 0);
  const generatedAt = String(fm.generated_at || "");

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

  return { date, fields, newsCount, topicsCount, generatedAt, news };
}

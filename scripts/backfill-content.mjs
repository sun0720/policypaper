/**
 * 回填脚本：从 raw JSON 中提取 content，插入到 export markdown 文件中
 * 用法：node scripts/backfill-content.mjs
 */
import fs from "fs";
import path from "path";

const RAW_DIR = path.join(process.cwd(), "data", "raw");
const EXPORTS_DIR = path.join(process.cwd(), "data", "exports");

/** 清理正文中的 HTML 片段和抓取残留 */
function sanitizeContent(raw) {
  if (!raw) return "";
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z]+;/gi, "")
    .replace(/UCAP-CONTENT"?>/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 从 URL 提取 gov.cn content ID 用于模糊匹配 */
function extractContentId(url) {
  const match = url?.match(/content_(\d+)\.htm/);
  return match ? match[1] : null;
}

/** 从所有 raw JSON 文件构建 URL → content 的映射 */
function buildContentMap() {
  if (!fs.existsSync(RAW_DIR)) return new Map();

  const map = new Map();
  const files = fs.readdirSync(RAW_DIR).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const data = JSON.parse(fs.readFileSync(path.join(RAW_DIR, file), "utf-8"));
    const articles = Array.isArray(data) ? data : [];

    for (const article of articles) {
      if (article.url && article.content && article.content.trim().length > 50) {
        // 优先用 content ID 做 key（更稳定），fallback 用完整 URL
        const contentId = extractContentId(article.url);
        const cleaned = sanitizeContent(article.content);

        if (cleaned) {
          map.set(article.url, cleaned);
          if (contentId) {
            map.set(`content_${contentId}`, cleaned);
          }
        }
      }
    }
  }

  return map;
}

/** 处理单个 export markdown 文件 */
function processExportFile(filePath, contentMap) {
  const original = fs.readFileSync(filePath, "utf-8");

  // 检查是否已经包含 content
  if (original.includes("**📄 新闻正文**")) {
    console.log(`  ⏭️  已包含正文，跳过：${path.basename(filePath)}`);
    return { updated: false, found: 0, total: 0 };
  }

  // 按 ## 分割每条新闻
  const parts = original.split(/\n(?=##\s)/);
  let updated = false;
  let foundCount = 0;
  let totalNews = 0;

  // parts[0] 是 frontmatter + 页面标题部分，保持不变
  const header = parts[0];
  const newsParts = parts.slice(1);

  const processedNews = newsParts.map((newsSection) => {
    totalNews++;

    // 提取 URL：匹配 markdown 链接或纯 URL
    const urlMatch = newsSection.match(
      /🔗\s*\*{0,2}原文链接\*{0,2}\s*[：:]\s*(?:\[.*?\]\((https?:\/\/[^)\s]+)\)|(https?:\/\/\S+))/
    );
    const url = urlMatch?.[1] || urlMatch?.[2];
    if (!url) return newsSection;

    // 查询 content
    let content = contentMap.get(url);
    if (!content) {
      // 尝试用 content ID 匹配
      const contentId = extractContentId(url);
      if (contentId) {
        content = contentMap.get(`content_${contentId}`);
      }
    }

    if (!content) return newsSection;

    foundCount++;

    // 在 ### 🎓 论文选题 之前插入 **📄 新闻正文**
    const insertMarker = "\n### 🎓 论文选题";
    const insertIndex = newsSection.indexOf(insertMarker);

    if (insertIndex === -1) return newsSection;

    const before = newsSection.slice(0, insertIndex);
    const after = newsSection.slice(insertIndex);

    // 清理 before 末尾的空白行，然后插入 content
    const trimmedBefore = before.replace(/\n+$/, "\n\n");
    const contentBlock = `**📄 新闻正文**\n\n${content}\n`;

    return trimmedBefore + contentBlock + after;
  });

  if (foundCount > 0) {
    const result = header + processedNews.join("");
    fs.writeFileSync(filePath, result, "utf-8");
    updated = true;
  }

  return { updated, found: foundCount, total: totalNews };
}

// ---- 主流程 ----
console.log("🔍 从 raw JSON 构建 content 映射...");
const contentMap = buildContentMap();
console.log(`  📦 共收集 ${contentMap.size} 条正文（含 URL 和 content ID 两种 key）\n`);

if (!fs.existsSync(EXPORTS_DIR)) {
  console.log("❌ exports 目录不存在，退出");
  process.exit(1);
}

const exportFiles = fs
  .readdirSync(EXPORTS_DIR)
  .filter((f) => f.endsWith("-paper-topics.md"))
  .sort();

for (const file of exportFiles) {
  const filePath = path.join(EXPORTS_DIR, file);
  console.log(`📄 处理：${file}`);
  const result = processExportFile(filePath, contentMap);
  if (result.updated) {
    console.log(`  ✅ 已插入：${result.found}/${result.total} 条新闻`);
  } else if (result.total === 0) {
    console.log(`  ⚠️  未找到新闻段落`);
  } else {
    console.log(`  ⚠️  未找到匹配内容（${result.total} 条新闻均无对应 raw 数据）`);
  }
}

console.log("\n✅ 回填完成");

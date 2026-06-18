export const meta = {
  name: 'cctv-pipeline',
  description: 'CCTV-only pipeline: scrape (with content) → filter → parallel analyze → combine → publish',
  phases: [
    { title: '🔍 Scrape', detail: 'Fetch today news segments + transcripts from tv.cctv.com via cctv-scraper' },
    { title: '🏷️ Filter', detail: 'Filter economic news via economic-filter' },
    { title: '🧠 Analyze', detail: 'Generate 5 paper topics per news item — one parallel agent each (batched, max 5 concurrent)' },
    { title: '🧩 Combine', detail: 'Merge all part files into final export' },
    { title: '🚀 Publish', detail: 'Publish to site via site-publisher' },
  ],
}

// ─── Retry wrapper ─────────────────────────────────────────

async function agentWithRetry(task, opts, maxRetries = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await agent(task, opts);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        log(`⚠️ [${opts.label}] 第 ${attempt}/${maxRetries} 次失败: ${err.message}，${delay / 1000}s 后重试...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  throw lastError;
}

// ─── Schemas ──────────────────────────────────────────────

const SCRAPE_SCHEMA = {
  type: 'object',
  properties: {
    count: { type: 'number' },
    skipped: { type: 'boolean' },
    reason: { type: 'string' },
    file: { type: 'string' },
  },
  required: ['count', 'skipped', 'file'],
}

const FILTER_SCHEMA = {
  type: 'object',
  properties: {
    count: { type: 'number' },
    skipped: { type: 'boolean' },
    reason: { type: 'string' },
    file: { type: 'string' },
    fields: { type: 'array', items: { type: 'string' } },
  },
  required: ['count', 'skipped', 'file'],
}

const TOPIC_SCHEMA = {
  type: 'object',
  properties: {
    news_index: { type: 'number' },
    title: { type: 'string' },
    topics_count: { type: 'number' },
    file: { type: 'string' },
  },
  required: ['topics_count', 'file'],
}

const COMBINE_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    topic_count: { type: 'number' },
    news_count: { type: 'number' },
  },
  required: ['file', 'topic_count', 'news_count'],
}

const PUBLISH_SCHEMA = {
  type: 'object',
  properties: {
    status: { type: 'string' },
    url: { type: 'string' },
    file: { type: 'string' },
    reason: { type: 'string' },
  },
  required: ['status'],
}

// ─── Date ──────────────────────────────────────────────────

if (!args?.date) {
  throw new Error('必须传入 args.date，例如: Workflow({ args: { date: "2026-06-09" } })')
}
const TODAY = args.date

// ─── State ─────────────────────────────────────────────────

let preSplitFailed = false
let failedIndices = []

// ═══════════════════════════════════════════════════════════
// Phase 1: Scrape
// ═══════════════════════════════════════════════════════════

phase('🔍 Scrape')
log(`[1/5] 抓取新闻联播片段（含文字稿）(${TODAY})...`)

let scrapeResult = null
try {
  scrapeResult = await agentWithRetry(
    `使用 **cctv-scraper** skill 抓取新闻联播 ${TODAY} 的新闻片段。

任务：
1. 调用 Skill 工具：skill="cctv-scraper"
2. 按 skill 指引抓取 tv.cctv.com 新闻联播片段
3. 使用 --content 参数抓取文字稿，结果保存到 data/raw/cctv/${TODAY}.json

若新闻联播今日尚未更新（页面 404），设置 skipped=true 并说明原因。`,
    { label: 'cctv-scraper', phase: '🔍 Scrape', schema: SCRAPE_SCHEMA }
  )
  log(`[1/5] ✅ 抓取 ${scrapeResult?.count ?? 0} 条新闻片段`)
} catch (err) {
  log(`[1/5] ❌ 爬虫失败: ${err.message}`)
  return { date: TODAY, status: 'scrape_failed', error: err.message }
}

// ═══════════════════════════════════════════════════════════
// Phase 2: Filter
// ═══════════════════════════════════════════════════════════

phase('🏷️ Filter')

if (!scrapeResult || scrapeResult.skipped || scrapeResult.count === 0) {
  log(`[2/5] ⏭️ 跳过 — ${scrapeResult?.reason || '今日无新闻片段'}`)
  return { date: TODAY, status: 'no_news', phases_completed: ['scrape'], scrape: scrapeResult }
}

log(`[2/5] 过滤经济新闻（从 ${scrapeResult.count} 条中筛选）...`)

let filterResult = null
try {
  filterResult = await agentWithRetry(
    `使用 **economic-filter** skill 过滤新闻联播的经济新闻。

任务：
1. 调用 Skill 工具：skill="economic-filter"
2. 读取 data/raw/cctv/${TODAY}.json
3. 按 skill 中的分类体系标注（注意：数据来源为新闻联播，分类基于标题+文字稿 content）
4. 只保留相关度 >= 2 的新闻
5. 结果保存到 data/filtered/cctv/${TODAY}.json

若无经济新闻，设置 skipped=true。`,
    { label: 'economic-filter', phase: '🏷️ Filter', schema: FILTER_SCHEMA }
  )
  log(`[2/5] ✅ 过滤出 ${filterResult?.count ?? 0} 条经济新闻`)
} catch (err) {
  log(`[2/5] ❌ 过滤失败: ${err.message}`)
  return { date: TODAY, status: 'filter_failed', error: err.message, scrape: scrapeResult }
}

// ═══════════════════════════════════════════════════════════
// Phase 3: Analyze（分批并行生成）
// ═══════════════════════════════════════════════════════════

phase('🧠 Analyze')

if (!filterResult || filterResult.skipped || filterResult.count === 0) {
  log(`[3/5] ⏭️ 跳过 — ${filterResult?.reason || '无经济新闻'}`)
  return {
    date: TODAY, status: 'no_economic_news',
    phases_completed: ['scrape', 'filter'], scrape: scrapeResult, filter: filterResult,
  }
}

const NEWS_COUNT = filterResult.count
const CONCURRENCY = 5 // 每批最多 5 个并发 agent，避免 API 限流
log(`[3/5] 🚀 分批并行生成：${NEWS_COUNT} 条新闻，每批最多 ${CONCURRENCY} 个并发...`)

// 预拆分
log(`[3/5] 📦 预拆分新闻数据...`)
try {
  await agentWithRetry(
    `用 Bash 执行，将 data/filtered/cctv/${TODAY}.json 中的每条新闻拆分为独立文件：

\`\`\`bash
mkdir -p data/.tmp/cctv-${TODAY}
python3 -c "
import json, os
with open('data/filtered/cctv/${TODAY}.json') as f:
    data = json.load(f)
news_list = data if isinstance(data, list) else data.get('news', data.get('items', []))
for i, news in enumerate(news_list, 1):
    with open(f'data/.tmp/cctv-${TODAY}/news-{i}.json', 'w') as out:
        json.dump(news, out, ensure_ascii=False, indent=2)
    print(f'  news {i}: ' + news.get('title', '')[:40])
print(f'Split {len(news_list)} items')
\"
\`\`\``,
    { label: 'pre-split', phase: '🧠 Analyze' }
  )
} catch (err) {
  preSplitFailed = true
  log(`[3/5] ⚠️ 预拆分失败: ${err.message}，回退到完整文件模式`)
}

// 分批并行：每批 CONCURRENCY 条，避免超过 API 并发限制
const topicResults = []
for (let batch = 0; batch < Math.ceil(NEWS_COUNT / CONCURRENCY); batch++) {
  const start = batch * CONCURRENCY + 1
  const end = Math.min(start + CONCURRENCY - 1, NEWS_COUNT)
  log(`[3/5] 📦 批次 ${batch + 1}/${Math.ceil(NEWS_COUNT / CONCURRENCY)}: news ${start}-${end}`)

  const batchResults = await pipeline(
    Array.from({ length: end - start + 1 }, (_, i) => start + i),
    (newsIndex) =>
      agentWithRetry(
        `使用 **paper-topic-analyzer** skill 为新闻联播经济新闻生成论文选题。

任务：
1. 调用 Skill 工具：skill="paper-topic-analyzer"
2. 读取 data/.tmp/cctv-${TODAY}/news-${newsIndex}.json（如不存在则从 data/filtered/cctv/${TODAY}.json 取第 ${newsIndex} 条）
3. 按 skill 指引，从 7 个视角中选 5 个，生成差异化论文选题
4. **重要**：新闻来源为「新闻联播」，Markdown 元数据中 📡 来源 写「新闻联播」
5. 结果写入 data/exports/cctv-${TODAY}-part-${newsIndex}.md`,
        { label: `news-${newsIndex}`, phase: '🧠 Analyze', schema: TOPIC_SCHEMA }
      )
  )
  topicResults.push(...batchResults)
}

// 追踪失败索引（替换静默丢弃）
const completed = []
failedIndices = []
for (let i = 0; i < topicResults.length; i++) {
  if (topicResults[i]) {
    completed.push(topicResults[i])
  } else {
    failedIndices.push(i + 1) // 1-based news index
  }
}
if (failedIndices.length > 0) {
  log(`[3/5] ⚠️ 失败选题: news [${failedIndices.join(', ')}]（${failedIndices.length} 条新闻未生成）`)
}
log(`[3/5] ✅ 并行完成：${completed.length}/${NEWS_COUNT} 条，共 ${completed.reduce((s, t) => s + (t.topics_count || 0), 0)} 个选题`)

// ═══════════════════════════════════════════════════════════
// Phase 4: Combine
// ═══════════════════════════════════════════════════════════

phase('🧩 Combine')

let combineResult = null
try {
  combineResult = await agentWithRetry(
    `合并 data/exports/cctv-${TODAY}-part-*.md 为最终导出文件 data/exports/cctv/${TODAY}-paper-topics.md。

1. Bash: mkdir -p data/exports/cctv && cat data/exports/cctv-${TODAY}-part-*.md > /tmp/cctv-merged.md
2. Read /tmp/cctv-merged.md
3. 前置 YAML frontmatter（date: ${TODAY}, source: cctv）+ 页面标题「# 📰 每日经济学论文选题 — 新闻联播」
4. Write → data/exports/cctv/${TODAY}-paper-topics.md
5. Bash: rm data/exports/cctv-${TODAY}-part-*.md && rm -rf data/.tmp/cctv-${TODAY}

返回 file / topic_count / news_count。`,
    { label: 'combine', phase: '🧩 Combine', schema: COMBINE_SCHEMA }
  )
  log(`[4/5] ✅ 合并完成：${combineResult?.file}（${combineResult?.topic_count ?? 0} 个选题）`)
} catch (err) {
  log(`[4/5] ⚠️ 合并失败: ${err.message}`)
}

// ═══════════════════════════════════════════════════════════
// Phase 5: Publish
// ═══════════════════════════════════════════════════════════

phase('🚀 Publish')

log('[5/5] 发布到网站...')

let publishResult = null
try {
  publishResult = await agentWithRetry(
    `使用 **site-publisher** skill 将新闻联播分析结果发布到网站。

任务：
1. 调用 Skill 工具：skill="site-publisher"
2. 读取 data/exports/cctv/${TODAY}-paper-topics.md
3. 按 skill 指引导入数据库并更新网站
4. 若数据库未就绪，status 设为 "saved"`,
    { label: 'site-publisher', phase: '🚀 Publish', schema: PUBLISH_SCHEMA }
  )
  log(`[5/5] ✅ ${publishResult?.status ?? 'unknown'}`)
} catch (err) {
  log(`[5/5] ⚠️ 发布异常: ${err.message}（数据已保留）`)
  publishResult = { status: 'saved', file: `data/exports/cctv/${TODAY}-paper-topics.md`, reason: err.message }
}

// ═══════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════

const newsCount = scrapeResult?.count ?? 0
const econCount = filterResult?.count ?? 0
const topicCount = combineResult?.topic_count ?? completed.reduce((s, t) => s + (t.topics_count || 0), 0)
const pubStatus = publishResult?.status ?? 'unknown'

log('')
log('══════════════════════════════════════')
log(`📺 新闻联播流水线完成 — ${TODAY}`)
log('══════════════════════════════════════')
log(`  🔍 Scrape : ${newsCount} 条新闻片段`)
log(`  🏷️ Filter : ${econCount} 条经济新闻`)
log(`  🧠 Analyze: ${topicCount} 个论文选题（${completed.length}/${NEWS_COUNT} 条成功）`)
if (failedIndices.length > 0) {
  log(`  ⚠️ 失败选题: news [${failedIndices.join(', ')}]`)
}
if (preSplitFailed) {
  log(`  ⚠️ 预拆分回退到完整文件模式`)
}
log(`  🚀 Publish: ${pubStatus}`)
if (publishResult?.reason && pubStatus !== 'published') {
  log(`  ⚠️ 发布备注: ${publishResult.reason}`)
}
log('══════════════════════════════════════')
log(`📁 data/exports/cctv/${TODAY}-paper-topics.md`)

return {
  date: TODAY,
  status: 'completed',
  source: 'cctv',
  phases_completed: ['scrape', 'filter', 'analyze', 'combine', 'publish'],
  counts: { news: newsCount, economic: econCount, topics: topicCount },
  publish_status: pubStatus,
  analytics: {
    pre_split_fallback: preSplitFailed,
    failed_news_indices: failedIndices,
  },
}

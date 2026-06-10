export const meta = {
  name: 'cctv-pipeline',
  description: 'Full automation for CCTV news: scrape (with content) → filter → parallel analyze → combine → publish',
  phases: [
    { title: '🔍 Scrape', detail: 'Fetch today news segments from tv.cctv.com via cctv-scraper (with --content for text)' },
    { title: '🏷️ Filter', detail: 'Filter economic news via economic-filter' },
    { title: '🧠 Analyze', detail: 'Generate 5 topics per news item — one parallel agent each' },
    { title: '🧩 Combine', detail: 'Merge all part files into final export' },
    { title: '🚀 Publish', detail: 'Publish to site via site-publisher' },
  ],
}

const TODAY = args?.date || '2026-06-09'

// ═══════════════════════════════════════════════════════════
// Phase 1: Scrape
// ═══════════════════════════════════════════════════════════

phase('🔍 Scrape')
log(`[1/5] 抓取新闻联播片段（含文字稿）(${TODAY})...`)

let scrapeResult = null
try {
  scrapeResult = await agent(
    `使用 **cctv-scraper** skill 抓取新闻联播 ${TODAY} 的新闻片段（含文字稿）。

任务：
1. 调用 Skill 工具：skill="cctv-scraper"
2. 按 skill 指引，使用 --content 参数抓取每条新闻的文字稿
3. 结果保存到 data/raw/cctv/${TODAY}.json

命令：
  python3 .claude/skills/cctv-scraper/scripts/scrape_cctv.py \\
    --date ${TODAY} \\
    --content \\
    --format json \\
    --output data/raw/cctv/${TODAY}.json \\
    --verbose

若新闻联播今日尚未更新（404），设置 skipped=true 并说明原因。`,
    { label: 'cctv-scraper', phase: '🔍 Scrape' }
  )
  log(`[1/5] ✅ 抓取新闻片段完成`)
} catch (err) {
  log(`[1/5] ❌ 爬虫失败: ${err.message}`)
  return { date: TODAY, status: 'scrape_failed', error: err.message }
}

// ═══════════════════════════════════════════════════════════
// Phase 2: Filter
// ═══════════════════════════════════════════════════════════

phase('🏷️ Filter')

log(`[2/5] 过滤经济新闻...`)

let filterResult = null
try {
  filterResult = await agent(
    `使用 **economic-filter** skill 过滤新闻联播的经济新闻。

任务：
1. 调用 Skill 工具：skill="economic-filter"
2. 读取 data/raw/cctv/${TODAY}.json
3. 按 skill 中的分类体系标注（分类基于标题+正文 content 字段）
4. 只保留相关度 >= 2 的新闻
5. 结果保存到 data/filtered/cctv/${TODAY}.json

若无经济新闻，设置 skipped=true。`,
    { label: 'economic-filter', phase: '🏷️ Filter' }
  )
  log(`[2/5] ✅ 过滤完成`)
} catch (err) {
  log(`[2/5] ❌ 过滤失败: ${err.message}`)
  return { date: TODAY, status: 'filter_failed', error: err.message, scrape: scrapeResult }
}

// ═══════════════════════════════════════════════════════════
// Phase 3: Analyze（并行逐条生成—核心优化）
// ═══════════════════════════════════════════════════════════

phase('🧠 Analyze')

// 统计经济新闻条数
let newsCount = 0
try {
  const check = await agent(
    `读取 data/filtered/cctv/${TODAY}.json，返回其中新闻条数。若文件不存在或数组为空，返回 0。`,
    { label: 'count-check', phase: '🧠 Analyze' }
  )
  newsCount = parseInt(check) || 0
} catch {
  newsCount = 0
}

if (newsCount === 0) {
  log(`[3/5] ⏭️ 跳过 — 无经济新闻`)
  return {
    date: TODAY, status: 'no_economic_news',
    phases_completed: ['scrape', 'filter'], scrape: scrapeResult, filter: filterResult,
  }
}

log(`[3/5] 🚀 并行生成：${newsCount} 条经济新闻 × 5 选题...`)

// 预拆分：将 filtered JSON 拆为独立文件
log(`[3/5] 📦 预拆分新闻数据...`)
try {
  await agent(
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
\`
\`\``,
    { label: 'pre-split', phase: '🧠 Analyze' }
  )
} catch (err) {
  log(`[3/5] ⚠️ 预拆分失败: ${err.message}，回退到完整文件模式`)
}

// pipeline 按 index 分发 — 每个 agent 优先读自己的小文件
const topicResults = await pipeline(
  Array.from({ length: newsCount }, (_, i) => i + 1),
  (newsIndex) =>
    agent(
      `你是经济学论文选题专家。读取 data/.tmp/cctv-${TODAY}/news-${newsIndex}.json（如不存在则从 data/filtered/cctv/${TODAY}.json 中取第 ${newsIndex} 条），为该新闻生成 5 个差异化论文选题，写入 data/exports/cctv-${TODAY}-part-${newsIndex}.md。

## 重要提醒
- 新闻来源为**新闻联播**，内容来自视频文字稿
- 基于标题 + content（文字稿正文）生成选题
- 选题要求：学术论文标题 20-40 字，研究问题可检验，理论框架具体，研究方法可操作

## 视角（7 选 5，不重复）
📊 新古典(市场均衡/资源配置) | 💰 凯恩斯(总需求/政策乘数) | 🏛️ 制度经济学(产权/交易成本/激励) | 🧠 行为经济学(有限理性/锚定/前景理论) | ⚖️ 政治经济学(国家-市场/央地博弈) | 🌏 发展经济学(结构转型/技术追赶) | 👷 劳动经济学(工资/就业/人力资本)

## 输出格式（每个选题严格按此模板）

\`\`\`markdown
## [新闻标题]

> 📂 **经济领域**：[领域]
> 📡 **来源**：新闻联播
> 🔗 **原文链接**：[url]

**📄 新闻正文**

[正文]

### 🎓 论文选题

#### 1. [视角] — [论文标题]

| | |
|---|---|
| **研究问题** | [...] |
| **理论框架** | [学者+理论] |
| **研究方法** | [方法] |
| **数据来源** | [来源] |
| **创新点** | [贡献] |

**🔬 研究思路**

**1. 理论分析与研究假说** [80-150字，H1/H2/H3]
**2. 识别策略** [80-150字，因果识别+假定]
**3. 计量模型设定** [80-150字，方程]
**4. 变量构造与数据** [80-150字]
**5. 稳健性检验方案** [80-150字，≥3种]

---
\`\`\`

要求：视角不重复、理论引用具体学者、数据来源可获取、研究思路每节 80-150 字`,

      { label: `news-${newsIndex}`, phase: '🧠 Analyze' }
    )
)

const completed = topicResults.filter(Boolean)
log(`[3/5] ✅ 并行完成：${completed.length}/${newsCount} 条新闻，选题生成完毕`)

// ═══════════════════════════════════════════════════════════
// Phase 4: Combine
// ═══════════════════════════════════════════════════════════

phase('🧩 Combine')

let combineResult = null
try {
  combineResult = await agent(
    `合并 data/exports/cctv-${TODAY}-part-*.md 所有分片文件为一个完整的 Markdown 导出文件。

## 步骤
1. 用 Bash: cat data/exports/cctv-${TODAY}-part-*.md > /tmp/cctv-combined-${TODAY}.md
2. 用 Read 读取 /tmp/cctv-combined-${TODAY}.md
3. 在前面添加 YAML frontmatter 和页面标题：

\`\`\`markdown
---
date: ${TODAY}
source: cctv
field: [汇总各新闻的经济领域，用 | 分隔]
topics_count: [总选题数]
---

# 📰 每日经济学论文选题 — 新闻联播

> 📅 **日期**：${TODAY}
> 📡 **新闻来源**：新闻联播
> 📊 **经济新闻**：${completed.length} 条
> 🎓 **论文选题**：[总选题数] 个
> 🏷️ **覆盖领域**：[汇总]

---
\`\`\`

4. 用 Write 写入 data/exports/cctv/${TODAY}.md
5. 用 Bash: cp data/exports/cctv/${TODAY}.md data/exports/cctv/${TODAY}-paper-topics.md
6. 用 Bash: rm data/exports/cctv-${TODAY}-part-*.md 清理分片文件

返回合并后的文件路径和总选题数。`,
    { label: 'combine', phase: '🧩 Combine' }
  )
  log(`[4/5] ✅ 合并完成：${combineResult?.file || `data/exports/cctv/${TODAY}.md`}`)
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
  publishResult = await agent(
    `使用 **site-publisher** skill 将新闻联播的分析结果发布到网站。

任务：
1. 调用 Skill 工具：skill="site-publisher"
2. 读取 data/exports/cctv/${TODAY}.md
3. 按 skill 指引导入数据库并更新网站页面
4. 若数据库未就绪，status 设为 "saved"`,
    { label: 'site-publisher', phase: '🚀 Publish' }
  )
  log(`[5/5] ✅ 发布完成`)
} catch (err) {
  log(`[5/5] ⚠️ 发布异常: ${err.message}（数据已保留）`)
  publishResult = { status: 'saved', file: `data/exports/cctv/${TODAY}.md`, reason: err.message }
}

// ═══════════════════════════════════════════════════════════
// Summary
// ═══════════════════════════════════════════════════════════

log('')
log('══════════════════════════════════════')
log(`📺 新闻联播流水线完成 — ${TODAY}`)
log('══════════════════════════════════════')
log(`  🔍 Scrape : 新闻联播片段`)
log(`  🏷️ Filter : ${newsCount} 条经济新闻`)
log(`  🧠 Analyze: ${completed.length} 条并行生成`)
log(`  🚀 Publish: ${publishResult?.status ?? 'unknown'}`)
log('══════════════════════════════════════')
log(`📁 data/exports/cctv/${TODAY}.md`)

return {
  date: TODAY,
  status: 'completed',
  source: 'cctv',
  phases_completed: ['scrape', 'filter', 'analyze', 'combine', 'publish'],
  counts: { economic: newsCount, completed: completed.length },
  publish_status: publishResult?.status,
}

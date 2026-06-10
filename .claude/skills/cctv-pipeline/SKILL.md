---
name: cctv-pipeline
description: >-
  Use when the user wants to run the CCTV-only PolicyPaper pipeline (新闻联播流水线, 联播全流程, cctv全流程) — orchestrates cctv-scraper → economic-filter → paper-topic-analyzer → site-publisher using Claude Code Workflow. Supports manual trigger and durable CronCreate scheduled daily execution at 21:37 when the broadcast transcript is available.
allowed-tools: Bash, Workflow, Skill, Read, Write, CronCreate
metadata:
  author: 42ailab
  version: '1.2'
  title: 新闻联播全流程流水线
  description_zh: >-
    PolicyPaper 新闻联播专用流水线，使用 Workflow 串联 cctv-scraper（含文字稿）→ economic-filter → paper-topic-analyzer → site-publisher 四个步骤。支持手动触发和 CronCreate 每晚 21:37 定时运行（新闻联播播出后的更新时间）。
---

# cctv-pipeline — 新闻联播全流程流水线

## Overview

使用 **Claude Code Workflow** 将新闻联播源的 4 个 Skill 串联为一条自动化流水线：

```
cctv-scraper ──→ economic-filter ──→ paper-topic-analyzer ──→ site-publisher
 (抓取+文字稿)     (过滤经济新闻)        (生成论文话题)           (发布到网站)
```

与 `policy-pipeline`（双源：gov.cn + 新闻联播）不同，`cctv-pipeline` 只跑新闻联播一个源，适用于：

- 新闻联播独立调试和补跑（如补跑历史日期：`args: { date: "2026-06-05" }`）
- 每晚 21:37 新闻联播更新后自动触发
- 不需要跑 gov.cn 时单独运行此流水线

## When to Use

**触发条件（任一即可）：**

- 用户说「运行新闻联播流水线」「联播全流程」「cctv全流程」「cctv-pipeline」
- 仅需跑新闻联播这一个源（不跑 gov.cn）
- 新闻联播补跑历史数据
- 调试 cctv-scraper → economic-filter → paper-topic-analyzer 的链路
- 设置每晚定时自动运行

**Don't use when:**

- 需要同时跑两个源 → 使用 `policy-pipeline`
- 只想单独运行某一步 → 直接用对应 skill（`cctv-scraper`、`economic-filter` 等）
- 只想跑 gov.cn → 使用 `policy-pipeline` 或直接调用 `gov-scraper`

## Quick Reference

| 操作 | 方式 |
|---|---|
| 🚀 手动运行今天 | 说「运行新闻联播流水线」或 `/cctv-pipeline` |
| 📅 运行指定日期 | `Workflow({ scriptPath: ".claude/skills/cctv-pipeline/scripts/pipeline.js", args: { date: "2026-06-09" } })` |
| ⏰ 每晚定时（持久化） | `CronCreate({ cron: "37 21 * * *", prompt: "/cctv-pipeline", durable: true })` |
| 🛑 停止定时 | `CronList` → 找 job ID → `CronDelete <job-id>` |
| 📊 查看进度 | `/workflows` |
| 📁 查看产出 | `data/exports/cctv/{date}.md` |

## How It Works

当本 Skill 被调用时，按以下步骤执行：

### Step 1: 检查已有数据

```bash
ls data/raw/cctv/$(date +%Y-%m-%d).json 2>/dev/null
```

告知用户结果。如已有数据，询问**复用**还是**重新抓取**。

### Step 2: 执行 Workflow 流水线

加载 `scripts/pipeline.js`，按 5 个 Phase 顺序执行：

| Phase | Skill | 输入 | 输出 |
|---|---|---|---|
| 🔍 Scrape | cctv-scraper | tv.cctv.com/lm/xwlb | `data/raw/cctv/{date}.json` |
| 🏷️ Filter | economic-filter | 新闻联播原始 JSON | `data/filtered/cctv/{date}.json` |
| 🧠 Analyze | paper-topic-analyzer | 经济新闻 JSON | 5 选题/条（并行 agent） |
| 🧩 Combine | — | 分片 MD | `data/exports/cctv/{date}.md` |
| 🚀 Publish | site-publisher | 合并 MD | 网站数据库 / 文件保留 |

执行方式：

```
Workflow({ scriptPath: ".claude/skills/cctv-pipeline/scripts/pipeline.js", args: { date: "YYYY-MM-DD" } })
```

> ⚠️ 必须传入 `args.date`，Workflow 脚本中不可使用 `new Date()`。

### Step 3: 输出汇总报告

```
📺 新闻联播流水线完成 — 2026-06-09
══════════════════════════════════════
  🔍 Scrape : 新闻联播片段 + 文字稿
  🏷️ Filter : 2 条经济新闻
  🧠 Analyze: 2 条并行生成（共 10 个选题）
  🚀 Publish: published
══════════════════════════════════════
📁 data/exports/cctv/2026-06-09.md
```

## Pipeline States

| 状态 | 触发条件 | 行为 |
|---|---|---|
| `completed` | 正常完成 | 5 个 Phase 全部执行 |
| `no_news` | 新闻联播今日尚未更新（404） | Phase 1 后结束 |
| `no_economic_news` | 过滤结果为空 | Phase 2 后结束 |
| `scrape_failed` | 爬虫网络错误 | Phase 1 异常退出 |
| `filter_failed` | 过滤处理异常 | Phase 2 异常退出 |
| `analyze_failed` | LLM API 异常 | Phase 3 异常退出 |

- 每个 Phase 独立 try/catch，前一步失败不影响已有数据文件
- `publish` 阶段异常不阻塞 — 数据保留在 `data/exports/cctv/` 供手动发布

## 与 policy-pipeline 的差异

| | cctv-pipeline | policy-pipeline |
|---|---|---|
| **新闻源** | 仅新闻联播 | gov.cn + 新闻联播（双源并行） |
| **抓取方式** | `--content` 含文字稿 | gov: 含正文; cctv: 含文字稿 |
| **数据目录** | `data/raw/cctv/` `data/filtered/cctv/` `data/exports/cctv/` | `data/raw/{gov,cctv}/` `data/filtered/{gov,cctv}/` `data/exports/{gov,cctv}/` |
| **推荐触发时间** | 每晚 21:37（新闻联播播出后） | 工作日上午 10:37（gov.cn 更新后） |
| **合并步骤** | 无需（单源） | 需要合并 gov + cctv |
| **Cron 设置** | `cron: "37 21 * * *"` | `cron: "37 10 * * 1-5"` |

## Scheduled Execution

### 持久化定时任务（推荐）

新闻联播每晚 19:00 播出，通常在 21:00 后更新到网站。推荐设置 21:37 触发：

```
CronCreate({
  cron: "37 21 * * *",
  prompt: "/cctv-pipeline",
  durable: true
})
```

### 管理定时任务

- 查看：`CronList`
- 取消：`CronDelete <job-id>`
- 注：recurring 任务 7 天后自动过期，需定期续期

## Common Mistakes

| 错误 | 原因 | 正确做法 |
|---|---|---|
| 触发时间过早 | 新闻联播文字稿需播出后约 2 小时才更新到网站 | 设置在 21:00 之后触发 |
| 重复运行同一天 | 浪费 API 调用 | Step 1 检查已有数据并询问 |
| 用 `/loop` 设置定时但失效 | 非持久化，session 关闭后丢失 | 使用 `CronCreate({ durable: true })` |
| Workflow 忘了传 `args.date` | `new Date()` 在 Workflow 中不可用 | 必须通过 `args: { date: "..." }` 传入 |
| Analyze 阶段每个 agent 从零写 prompt | 重复生成相同的视角选择和格式要求 | pipeline.js v1.1 已改为 delegate 到 paper-topic-analyzer Skill |
| 以为无文字稿 | 旧版 cctv-scraper 无 --content | 升级 cctv-scraper v2.0+，pipeline v1.1 默认启用 --content |
| 手动触发时不传日期 | 默认 fallback 日期可能已过期 | 在 Workflow 调用时显式传入 `args: { date: "YYYY-MM-DD" }` |

## Resources

- `scripts/pipeline.js` — Workflow 编排脚本（核心），5 阶段 + 结构化错误处理

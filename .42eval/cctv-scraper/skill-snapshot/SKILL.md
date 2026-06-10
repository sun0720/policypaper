---
name: cctv-scraper
description: Use when the user wants to scrape, crawl, or fetch the latest news from 新闻联播 (CCTV News Broadcast, tv.cctv.com/lm/xwlb/) — provides tools for fetching today's news segment titles, filtering by date, and producing structured JSON output for downstream economic-filter and paper-topic-analyzer skills.
metadata:
  author: 42ailab
  version: '1.0'
  title: 新闻联播抓取器
  description_zh: 每日自动抓取新闻联播 (tv.cctv.com/lm/xwlb/) 的新闻片段标题。支持按日期过滤、结构化 JSON 输出。注意：视频页面无文字稿，content 字段恒为空。
---

# 新闻联播抓取器 (cctv-scraper)

## Overview

从央视网新闻联播栏目 (tv.cctv.com/lm/xwlb/) 抓取每日新闻片段。页面为服务端渲染 HTML，无需无头浏览器。**默认抓取今日新闻片段**，自动跳过整期完整版视频。

> ⚠️ **重要限制**：新闻联播视频页面**不含文字稿（transcript）**。`content` 字段恒为空字符串。下游 `economic-filter` 和 `paper-topic-analyzer` 仅能基于**标题**进行分类和选题生成。

## When to Use

- 抓取今日/指定日期新闻联播的新闻片段标题
- 为下游 `economic-filter` 提供新闻联播数据输入
- 设置每日自动定时抓取
- 调试抓取失败、排查页面结构变更

**Don't use for:**
- 抓取中国政府网新闻 → 使用 `gov-scraper` skill
- 筛选经济相关新闻 → 使用 `economic-filter` skill
- 生成论文选题 → 使用 `paper-topic-analyzer` skill
- 发布到网站 → 使用 `site-publisher` skill

## Quick Reference

| 操作 | 命令 / 方式 |
|---|---|
| 抓取今日新闻片段 | `python3 scripts/scrape_cctv.py` |
| 抓取指定日期 | `python3 scripts/scrape_cctv.py --date YYYY-MM-DD` |
| JSON 格式输出 | `python3 scripts/scrape_cctv.py --format json` |
| 仅输出标题列表 | `python3 scripts/scrape_cctv.py --titles-only` |
| 详细日志 | `python3 scripts/scrape_cctv.py --verbose` |
| 每日自动抓取 | `/loop 1d python3 .claude/skills/cctv-scraper/scripts/scrape_cctv.py --format json` |

## 数据源结构

### URL 模式

| 用途 | URL |
|---|---|
| 列表首页（最新一期） | `https://tv.cctv.com/lm/xwlb/` |
| 指定日期 | `https://tv.cctv.com/lm/xwlb/day/YYYYMMDD.shtml` |
| 单条视频页 | `https://tv.cctv.com/YYYY/MM/DD/VIDExxxxxx.shtml` |

### 页面结构

两种页面格式（脚本自动兼容）：

**首页格式** — `<ul id="content" class="rililist newsList">` 包裹 `<li>` 项。
**日期页格式** — 裸 `<li>` 元素，无 `<ul>` 包裹。

两种格式中，每条 `<li>` 分为两类：

| CSS 标识 | 含义 | 抓取策略 |
|---|---|---|
| `<i class="sql0">完整版</i>` | 整期新闻联播视频 | **跳过** |
| `<i class="sql1">完整版</i>` | 单条新闻片段 | **抓取** |

完整页面结构文档见 [references/page-structure.md](references/page-structure.md)。

## Workflow

### 1. 一次性手动抓取

```bash
# 抓取今日新闻片段，表格格式输出
python3 scripts/scrape_cctv.py

# 抓取指定日期，JSON 格式
python3 scripts/scrape_cctv.py --date 2026-06-09 --format json

# 仅输出标题列表
python3 scripts/scrape_cctv.py --date 2026-06-09 --titles-only
```

### 2. 设置每日自动抓取

```bash
/loop 1d python3 .claude/skills/cctv-scraper/scripts/scrape_cctv.py --format json
```

### 3. 调试抓取失败

```bash
# 详细日志
python3 scripts/scrape_cctv.py --date 2026-06-09 --verbose

# 检查页面是否可访问
curl -I https://tv.cctv.com/lm/xwlb/day/20260609.shtml

# 检查页面中是否有 sql1 项
curl -s "https://tv.cctv.com/lm/xwlb/day/20260609.shtml" | grep -c "sql1"
```

## Script: scrape_cctv.py

核心抓取脚本，位于 `scripts/scrape_cctv.py`。零外部依赖（仅 Python 标准库）。

### 功能

- 获取列表页 HTML（首页或日期页）
- 自动跳过 `sql0` 完整版条目
- 提取 `sql1` 单条片段的标题、URL、日期、缩略图
- 支持多种输出格式（表格、JSON、JSONL、纯标题）
- 今日页面不存在时自动回退到列表首页
- 完善的错误处理

### 命令行参数

```
--date DATE       指定日期 (YYYY-MM-DD 或 YYYYMMDD)
--format FORMAT   输出格式: table (默认), json, jsonl
--titles-only     只输出标题列表
--verbose, -v     输出详细日志到 stderr
--help, -h        显示帮助
```

> **默认行为**：不带任何日期参数时，默认抓取**今日**新闻。若今日页面 404，自动回退到列表首页。

### 输出格式

#### JSON 格式（推荐用于下游管道）

```json
[
  {
    "title": "前5个月我国货物贸易进出口同比增长15.3%",
    "url": "https://tv.cctv.com/2026/06/09/VIDEzAEu80lkby0LvlxVHzn8260609.shtml",
    "date": "2026-06-09",
    "content": "",
    "thumbnail": "//p1.img.cctvpic.com/photoAlbum/vms/standard/img/2026/6/9/VIDE6pNn5isDhpPwqZN9vZI1260609.jpg",
    "source": "cctv"
  }
]
```

#### 表格格式

```
📺 新闻联播 — 2026-06-09 (共 15 条片段)
────────────────────────────────────────────────────────────
 1. 习近平出席金正恩举行的欢迎宴会
    链接: https://tv.cctv.com/2026/06/09/VIDEKTvaPwYa4HtIAD2aeTOv260609.shtml
 2. 习近平和彭丽媛观看朝鲜专场文艺演出
    链接: https://tv.cctv.com/2026/06/09/VIDE2n8Uh4OwnHuQhwsFLVAU260609.shtml
...
```

## Integration with Downstream Skills

```
cctv-scraper 输出 (JSON)
    │
    ▼
economic-filter ──→ paper-topic-analyzer ──→ site-publisher
    │                      │                       │
  筛选经济新闻         生成论文选题            发布到网站
```

cctv-scraper 与 gov-scraper 的 JSON 输出格式兼容，可合并后进入同一流水线。

### 与 gov-scraper 输出的差异

| 字段 | gov-scraper | cctv-scraper | 说明 |
|---|---|---|---|
| `title` | ✅ | ✅ | 格式一致 |
| `url` | ✅ | ✅ | 格式一致 |
| `date` | ✅ | ✅ | `YYYY-MM-DD` |
| `content` | ✅ (正文全文) | ⚠️ (恒为空) | 无文字稿 |
| `thumbnail` | ❌ | ✅ | 缩略图 URL |
| `source` | ❌ (隐式) | ✅ (`"cctv"`) | 来源标识 |

> ⚠️ 下游 `economic-filter` 需适配 `content` 为空的情况 — 仅基于标题进行分类。标题通常包含足够信息用于经济判断（如「前5个月我国货物贸易进出口同比增长15.3%」）。

## Common Mistakes

| 错误 | 原因 | 解决 |
|---|---|---|
| 脚本返回空列表 | 今日页面尚未上线（404），回退到首页但首页也无数据 | 等待新闻联播播出后（通常 19:30 后更新到网站）；指定 `--date` 查历史日期 |
| 输出含「完整版」条目 | 未过滤 `sql0` | 升级脚本版本；`sql0` 应被自动跳过 |
| 某天数据为空（周末/节假日） | 新闻联播每天播出，但网站可能延迟更新 | 延迟几小时重试 |
| content 字段为空 | 视频页面无文字稿，这是预期行为 | 正常；下游基于标题工作 |
| 标题还带 `[视频]` 前缀 | 脚本未正确清理 | 检查 `clean_title()` 函数；已预编译 `RE_VIDEO_TAG` 正则 |

## Resources

### Scripts
- `scripts/scrape_cctv.py` — 核心抓取脚本

### References
- `references/page-structure.md` — 新闻联播网站页面 HTML 结构文档

# Claude Code 指南

## 项目

**EconTopic**：每日抓取中国政府网经济新闻，AI 生成经济学论文话题，发布到网站。

## 项目类型

混合型（开发 + 研究）— 涉及数据工程、Web 开发与经济学研究三重属性。

## 项目结构

- **提示词/** - 系统架构规划与 Prompt 设计文档
- **docs/** - 技术文档
- **notes/** - 笔记和研究草稿
- **src/** - 源代码（爬虫、分析、前端）

## 核心模块

1. `gov-scraper` — 中国政府网 (gov.cn) 新闻爬虫
2. `economic-filter` — 经济新闻分类与过滤
3. `paper-topic-analyzer` — LLM 经济学论文话题生成
4. `site-publisher` — 网站展示与发布

详见 `提示词/系统架构与Skills规划.md`

## 规则

- 文档使用中文，文件名和代码标识符使用英文
- 修改代码后，自动提交 Git 并部署到 Cloudflare Pages
- 部署命令：`wrangler pages deploy out/`（需先 `npm run build` 生成静态导出）
- 敏感信息（API Key、数据库密码等）存 `.env.local`，不入 Git
- 代码注释使用中文，便于经济学背景人员理解
- 每次重大改动后更新 CHANGELOG

## 技术栈

- 爬虫：Python + Playwright 或 Node.js + Puppeteer
- 前端：Next.js 16 + shadcn/ui + Tailwind CSS
- 数据库：Vercel Postgres（Neon）或 Supabase
- AI 服务：Claude API
- 定时任务：Vercel Cron Jobs 或 Cloudflare Workers
- 部署：Cloudflare Pages（域名 policypaper.pages.dev）

## 外部资源

- 中国政府网：https://www.gov.cn
- 架构规划：`提示词/系统架构与Skills规划.md`

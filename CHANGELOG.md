# Changelog

本项目遵循 [Keep a Changelog](https://keepachangelog.com/) 规范。

## [1.1.0] — 2026-06-18

### Added
- **流水线韧性**：`cctv-pipeline` 和 `policy-pipeline` 添加指数退避重试机制（最多 3 次，2s/4s/8s），减少 API Socket 中断导致的选题丢失
- **并发限制**：Analyze 阶段改为分批并行（每批最多 5 个 agent），避免 LLM API 限流
- **失败追踪**：Analyze 阶段记录失败新闻索引，汇总报告中明确列出
- **增强汇总**：报告增加失败选题索引、预拆分回退标记、发布失败原因
- **deploy 脚本**：`package.json` 添加 `npm run deploy` 一键构建+部署

### Changed
- **Combine 阶段**：仅保留 `-paper-topics.md` 文件（前端消费格式），不再生成重复 `.md` 文件
- **Combine 阶段**：合并后自动清理 `.tmp` 临时目录和分片文件
- **policy-pipeline**：修复硬编码日期回退（`'2026-06-02'`），改为必传 `args.date` 参数校验

### Removed
- 删除 `data/exports/` 下 ~3.9MB 重复/过期数据文件
- 清理 14 个 `.tmp` 临时目录和孤立分片文件

## [1.0.0] — 2026-06-01

### Initial Release
- 4 核心模块：gov-scraper, cctv-scraper, economic-filter, paper-topic-analyzer
- 2 流水线：policy-pipeline (gov.cn), cctv-pipeline (新闻联播)
- Next.js 16 前端 + Cloudflare Pages 部署
- 静态导出，双源切换展示

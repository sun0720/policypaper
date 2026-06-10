# EconTopic

每日自动抓取**中国政府网 (www.gov.cn)** 和**新闻联播 (tv.cctv.com/lm/xwlb/)** 最新经济新闻，利用 AI 深度分析新闻中可进行经济学论文写作的话题方向，并将分析结果发布到网站。

## 项目定位

帮助经济学研究者快速发现中国政策热点中的研究机会，将政务新闻转化为学术论文选题。

## 工作原理

```
中国政府网 ──→ gov 数据 ──→ 经济筛选 ──→ AI 分析 ──→ 静态页面
新闻联播   ──→ cctv 数据 ──→ 经济筛选 ──→ AI 分析 ──→（双源合并）
```

当前仓库实现的是网站展示层：从 `data/exports/gov/` 和 `data/exports/cctv/` 读取每日论文选题导出文件，解析为结构化数据，双源合并后生成首页、日期页、分类页和新闻详情页。

规划中的自动化链路包括：

1. **每日抓取** — 自动爬取 gov.cn 和新闻联播最新新闻
2. **经济筛选** — 提取经济相关内容
3. **AI 分析** — 生成多视角论文写作方向
4. **网站发布** — 将导出文件纳入静态站构建

## 技术栈

- **前端**：Next.js 16 + React 19 + Tailwind CSS
- **数据源**：本地 Markdown/JSON 文件（双源：gov + cctv）
- **部署**：Next.js static export，可部署到 Vercel 或任意静态托管

## 项目结构

```
├── data/
│   ├── raw/
│   │   ├── gov/          # 中国政府网原始抓取数据
│   │   └── cctv/         # 新闻联播原始抓取数据
│   ├── filtered/
│   │   ├── gov/          # 中国政府网经济新闻筛选结果
│   │   └── cctv/         # 新闻联播经济新闻筛选结果
│   ├── exports/
│   │   ├── gov/          # 网站读取的每日论文选题 Markdown
│   │   └── cctv/         # 网站读取的每日论文选题 Markdown
│   └── .cache/           # 构建缓存（parsed.json）
├── src/                  # Next.js 源代码
├── scripts/              # 数据校验等工程脚本
├── 提示词/                # 架构规划与 Prompt 设计
└── README.md             # 项目说明
```

## 开始

```bash
# 安装依赖
npm install

# 启动开发环境
npm run dev

# 类型检查
npm run typecheck

# 校验 data/exports 导出文件
npm run validate:data

# 完整检查
npm run check

# 部署到 Vercel
vercel deploy
```

## 许可

个人研究项目。

# 新闻联播网站页面结构

> 调研日期：2026-06-10
> 目标网站：https://tv.cctv.com/lm/xwlb/

## 页面渲染方式

**服务端渲染 HTML**，新闻列表直接内嵌在 HTML 中，无需 JavaScript 执行。Python 标准库即可抓取。

## URL 模式

| 用途 | URL |
|---|---|
| 列表页（默认最新） | `https://tv.cctv.com/lm/xwlb/` |
| 指定日期 | `https://tv.cctv.com/lm/xwlb/day/YYYYMMDD.shtml` |
| 单条视频页 | `https://tv.cctv.com/YYYY/MM/DD/VIDExxxxxx.shtml` |

## 列表页 HTML 结构

```html
<ul id="content" class="rililist newsList">
  <!-- 第一条：完整版（整期节目），跳过 -->
  <li>
    <div class="image">
      <a href="https://tv.cctv.com/2026/06/09/VIDEtwZ9ud5Hpu0jBw43sgYa260609.shtml"
         alt="《新闻联播》 20260609 21:00"
         title="《新闻联播》 20260609 21:00">
        <img src="//p4.img.cctvpic.com/photoAlbum/vms/standard/img/2026/6/9/VIDEEjdHTKOAFdtevsZjuR18260609.jpg" />
      </a>
      <span></span>
    </div>
    <a href="...">
      <i class="sql0">完整版</i>《新闻联播》 20260609 21:00
    </a>
  </li>

  <!-- 后续条目：单条新闻片段，抓取 -->
  <li>
    <div class="image">
      <a href="https://tv.cctv.com/2026/06/09/VIDEKTvaPwYa4HtIAD2aeTOv260609.shtml"
         alt="[视频]习近平出席金正恩举行的欢迎宴会"
         title="[视频]习近平出席金正恩举行的欢迎宴会">
        <img src="//p5.img.cctvpic.com/photoAlbum/vms/standard/img/2026/6/9/VIDEclfO9Iwv0tKm98A6SMjG260609.jpg" />
      </a>
      <span></span>
    </div>
    <a href="...">
      <i class="sql1">完整版</i>[视频]习近平出席金正恩举行的欢迎宴会
    </a>
  </li>
  ...
</ul>
```

## 两种条目类型

| CSS 标识 | 含义 | 抓取策略 |
|---|---|---|
| `<i class="sql0">完整版</i>` | 整期新闻联播视频 | **跳过** — 无独立主题 |
| `<i class="sql1">完整版</i>` | 单条新闻视频片段 | **抓取** — 有独立标题 |

## 可提取字段

| 字段 | 提取方式 | 示例 |
|---|---|---|
| `title` | `<a>` 的 `alt` 属性，去除 `[视频]` 前缀 | `习近平出席金正恩举行的欢迎宴会` |
| `url` | `<a>` 的 `href` 属性 | `https://tv.cctv.com/2026/06/09/VIDEKTvaPwYa4HtIAD2aeTOv260609.shtml` |
| `date` | 从 URL 路径提取 `/YYYY/MM/DD/` | `2026-06-09` |
| `thumbnail` | `<img>` 的 `src` 属性 | `//p5.img.cctvpic.com/.../xxx.jpg` |

## ⚠️ 视频详情页分析

视频详情页（如 `https://tv.cctv.com/2026/06/09/VIDExxx.shtml`）**不含文字稿（transcript）**，仅有：
- 视频播放器
- `<meta name="description">` — 简短描述（通常 = 标题）
- `<meta name="keywords">` — 关键词

**结论**：无法获取正文全文。`content` 字段恒为空。

## API 可用性

| API 端点 | 用途 | 状态 |
|---|---|---|
| `api.cntv.cn/lanmu/columnInfoByColumnId` | 栏目元数据 | ✅ 可用 |
| `api.cntv.cn/NewVideo/getVideoListByColumnId` | 视频列表 | ❌ 拒绝访问 (1100) |
| `api.cntv.cn/video/videoinfoByGuid` | 视频详情 | ❌ 参数错误 (1001) |

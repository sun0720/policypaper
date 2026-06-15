/**
 * SourceTabs — 双源切换客户端组件
 * 解决 Next.js 客户端导航后 inline <script> 事件丢失的问题
 * 使用 React onClick 而非 DOM addEventListener，天然支持组件重新挂载
 */
"use client";

import { useState, useEffect, useCallback } from "react";

type Source = "gov" | "cctv";

interface SourceTabsProps {
  /** 当前激活的来源 */
  active: Source;
}

export function SourceTabs({ active: initialSource }: SourceTabsProps) {
  const [activeSource, setActiveSource] = useState<Source>(initialSource);

  // 首次挂载时读取 URL 参数覆盖默认值
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sourceParam = params.get("source");
    if (sourceParam === "cctv" || sourceParam === "gov") {
      setActiveSource(sourceParam);
    }
    // 只在挂载时执行一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabClick = useCallback(
    (source: Source, e: React.MouseEvent) => {
      e.preventDefault();

      const targetEl = document.getElementById(`source-${source}`);
      const otherEl = document.getElementById(
        `source-${source === "gov" ? "cctv" : "gov"}`
      );

      if (targetEl) targetEl.style.display = "";
      if (otherEl) otherEl.style.display = "none";

      // 同步 URL（不触发导航）
      const url = new URL(window.location.href);
      url.searchParams.set("source", source);
      window.history.replaceState(null, "", url.toString());

      setActiveSource(source);
    },
    []
  );

  const isGov = activeSource === "gov";

  return (
    <div className="source-tabs">
      <a
        href="#source-gov"
        className={`source-tab${isGov ? " active" : ""}`}
        data-source="gov"
        onClick={(e) => handleTabClick("gov", e)}
      >
        🇨🇳 中国政府网
      </a>
      <a
        href="#source-cctv"
        className={`source-tab${!isGov ? " active" : ""}`}
        data-source="cctv"
        onClick={(e) => handleTabClick("cctv", e)}
      >
        📺 新闻联播
      </a>
    </div>
  );
}

/**
 * TopicCard — 学术论文选题卡片
 * 展示一个经济学论文选题的完整信息（研究问题、理论框架、研究方法、数据来源、创新点）
 *
 * 🚀 性能优化：预编译正则 + useMemo 缓存 ResearchBody 渲染结果
 */
import React, { memo, useMemo } from "react";
import type { TopicData } from "@/lib/parser";

// ═══════════════════════════════════════════════════════════
// 预编译正则（模块级常量，避免每次渲染重复编译）
// ═══════════════════════════════════════════════════════════

const RE_SPLIT_DOUBLE_NEWLINE = /\n\n/;
const RE_RESEARCH_SECTION = /\n(?=\*\*\d+\.\s+)/;
const RE_SECTION_TITLE = /^\*\*(\d+\.\s+.+?)\*\*/;
const RE_BOLD_SPLIT = /(\*\*.*?\*\*)/g;
const RE_LIST_ITEM = /^\s*(?:[-•]|\d+[.)])\s+/;
const RE_MATH_LINE = /^[\s]*[A-Za-z0-9αβγδεθμσΣ_{}\[\]()=+\-*/<>,.^~′\s]+$/;

interface TopicCardProps {
  topic: TopicData;
  showOrder?: boolean;
}

export const TopicCard = memo(function TopicCard({ topic, showOrder = true }: TopicCardProps) {
  const label = showOrder
    ? `选题 ${topic.sortOrder} · ${topic.perspective}`
    : topic.perspective;

  return (
    <article className="topic-card" id={`topic-${topic.sortOrder}`}>
      {/* 视角标签 */}
      <div className="perspective-label">{label}</div>

      {/* 论文标题 */}
      <div className="topic-title">{topic.title}</div>

      {/* Info table */}
      <table>
        <tbody>
          <InfoRow label="研究问题" value={topic.researchQuestion} />
          {topic.theoreticalFramework && (
            <InfoRow label="理论框架" value={topic.theoreticalFramework} />
          )}
          {topic.methodology && (
            <InfoRow label="研究方法" value={topic.methodology} />
          )}
          {topic.dataSources && (
            <InfoRow label="数据来源" value={topic.dataSources} />
          )}
          {topic.innovation && (
            <InfoRow label="创新点" value={topic.innovation} />
          )}
        </tbody>
      </table>

      {/* 🔬 研究思路 */}
      {topic.researchApproach && (
        <ResearchApproach content={topic.researchApproach} />
      )}
    </article>
  );
});

const InfoRow = memo(function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td>{label}</td>
      <td>{value}</td>
    </tr>
  );
});

/**
 * 渲染 🔬 研究思路 段落
 * 按 **N. 标题** 拆分子节，处理段落、列表和方程块
 */
function ResearchApproach({ content }: { content: string }) {
  // 🚀 useMemo 缓存拆分结果 — 避免每次渲染重复执行正则
  const sections = useMemo(() => {
    return content.split(RE_RESEARCH_SECTION);
  }, [content]);

  return (
    <div className="research-approach">
      {sections.map((section, i) => {
        // Extract **N. Title** header
        const titleMatch = section.match(RE_SECTION_TITLE);
        const title = titleMatch ? titleMatch[1] : null;
        const body = titleMatch
          ? section.slice(titleMatch[0].length).trim()
          : section.trim();

        return (
          <div key={i} className="research-approach-subsection">
            {title && (
              <div className="research-approach-subtitle">{title}</div>
            )}
            <ResearchBody key={i} content={body} />
          </div>
        );
      })}
    </div>
  );
}

/** 渲染研究思路子节正文：处理段落、列表和方程块 */
function ResearchBody({ content }: { content: string }) {
  // 🚀 useMemo 缓存渲染块分类结果
  const blocks = useMemo(() => {
    return content.split(RE_SPLIT_DOUBLE_NEWLINE).filter(Boolean);
  }, [content]);

  return (
    <>
      {blocks.map((block, i) => {
        const lines = block.split("\n");

        // 方程块检测：≥2 行且每行都是数学符号模式
        const isMathBlock =
          lines.length >= 2 &&
          lines.every((l) => RE_MATH_LINE.test(l.trim()) && l.trim().length > 0);

        if (isMathBlock) {
          return (
            <pre key={i} className="math-block">
              {lines.join("\n")}
            </pre>
          );
        }

        // 列表块检测
        if (
          lines.every(
            (l) => RE_LIST_ITEM.test(l) || l.trim() === ""
          )
        ) {
          return (
            <ul key={i}>
              {lines
                .filter((l) => l.trim())
                .map((l, j) => (
                  <li key={j}>{l.replace(RE_LIST_ITEM, "")}</li>
                ))}
            </ul>
          );
        }

        // 普通段落
        return (
          <p key={i}>
            {lines.map((line, j) => (
              <React.Fragment key={j}>
                {j > 0 && <br />}
                {renderInline(line)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </>
  );
}

/** 渲染行内 bold 标记 */
function renderInline(text: string): React.ReactNode {
  const parts = text.split(RE_BOLD_SPLIT);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

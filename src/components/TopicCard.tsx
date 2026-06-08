/**
 * TopicCard — 学术论文选题卡片
 * 展示一个经济学论文选题的完整信息（研究问题、理论框架、研究方法、数据来源、创新点）
 */
import React, { memo } from "react";
import type { TopicData } from "@/lib/parser";

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
  // Split by **N. Title** pattern (at line start)
  const sections = content.split(/\n(?=\*\*\d+\.\s+)/);

  return (
    <div className="research-approach">
      {sections.map((section, i) => {
        // Extract **N. Title** header
        const titleMatch = section.match(/^\*\*(\d+\.\s+.+?)\*\*/);
        const title = titleMatch ? titleMatch[1] : null;
        const body = titleMatch
          ? section.slice(titleMatch[0].length).trim()
          : section.trim();

        return (
          <div key={i} className="research-approach-subsection">
            {title && (
              <div className="research-approach-subtitle">{title}</div>
            )}
            <ResearchBody content={body} />
          </div>
        );
      })}
    </div>
  );
}

/** 渲染研究思路子节正文：处理段落、列表和方程块 */
function ResearchBody({ content }: { content: string }) {
  // Split on double newlines to separate logical blocks
  const blocks = content.split(/\n\n/).filter(Boolean);

  return (
    <>
      {blocks.map((block, i) => {
        // 方程块：以缩进开头或含特殊字符的行
        const lines = block.split("\n");
        const isMathBlock =
          lines.length >= 2 &&
          lines.every((l) => /^[\s]*[A-Za-z0-9αβγδεθμσΣ_{}\[\]()=+\-*/<>,.^~′\s]+$/.test(l.trim()) && l.trim().length > 0);

        if (isMathBlock) {
          return (
            <pre key={i} className="math-block">
              {lines.join("\n")}
            </pre>
          );
        }

        // 列表块：以 - 或数字开头
        if (
          lines.every(
            (l) => /^\s*(?:[-•]|\d+[.)])\s+/.test(l) || l.trim() === ""
          )
        ) {
          return (
            <ul key={i}>
              {lines
                .filter((l) => l.trim())
                .map((l, j) => (
                  <li key={j}>{l.replace(/^\s*(?:[-•]|\d+[.)])\s+/, "")}</li>
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
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

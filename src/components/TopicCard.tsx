/**
 * TopicCard — 学术论文选题卡片
 * 展示一个经济学论文选题的完整信息（研究问题、理论框架、研究方法、数据来源、创新点）
 */
import React from "react";
import type { TopicData } from "@/lib/parser";

interface TopicCardProps {
  topic: TopicData;
  showOrder?: boolean;
}

export function TopicCard({ topic, showOrder = true }: TopicCardProps) {
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
    </article>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <td>{label}</td>
      <td>{value}</td>
    </tr>
  );
}

/**
 * 领域标签 Badge — 不同经济领域有不同颜色
 */
import React from "react";

/** 领域颜色映射：根据 emoji 返回 Tailwind 色系 */
function fieldColorClass(field: string): string {
  if (field.includes("🏭")) return "badge-industry";
  if (field.includes("📊") || field.includes("💹")) return "badge-macro";
  if (field.includes("💰") || field.includes("🏦")) return "badge-finance";
  if (field.includes("🌏") || field.includes("🌐")) return "badge-trade";
  if (field.includes("🏘") || field.includes("🏙")) return "badge-regional";
  return "badge-default";
}

export function FieldBadge({ field }: { field: string }) {
  return (
    <span className={`badge ${fieldColorClass(field)}`}>
      {field}
    </span>
  );
}

/** 小尺寸版本 — 用于卡片元数据行 */
export function FieldBadgeSm({ field }: { field: string }) {
  return (
    <span
      className={`badge ${fieldColorClass(field)}`}
      style={{ fontSize: "0.75rem", padding: "0.1rem 0.45rem" }}
    >
      {field}
    </span>
  );
}

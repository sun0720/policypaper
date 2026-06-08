/**
 * 领域标签 Badge — 不同经济领域有不同颜色
 */
import React, { memo } from "react";

/** 领域颜色映射：根据 emoji 返回 Tailwind 色系 */
function fieldColorClass(field: string): string {
  if (field.includes("🏭") || field.includes("产业经济")) return "badge-industry";
  if (field.includes("📊") || field.includes("💹") || field.includes("宏观")) return "badge-macro";
  if (field.includes("💰") || field.includes("🏦") || field.includes("金融")) return "badge-finance";
  if (field.includes("🌏") || field.includes("🌐") || field.includes("国际贸易") || field.includes("对外经济")) return "badge-trade";
  if (field.includes("🏘") || field.includes("🏙") || field.includes("区域")) return "badge-regional";
  return "badge-default";
}

export const FieldBadge = memo(function FieldBadge({ field }: { field: string }) {
  return (
    <span className={`badge ${fieldColorClass(field)}`}>
      {field}
    </span>
  );
});

/** 小尺寸版本 — 用于卡片元数据行 */
export const FieldBadgeSm = memo(function FieldBadgeSm({ field }: { field: string }) {
  return (
    <span
      className={`badge ${fieldColorClass(field)}`}
      style={{ fontSize: "0.75rem", padding: "0.1rem 0.45rem" }}
    >
      {field}
    </span>
  );
});

/**
 * FilterBar — 按经济领域筛选标签栏
 */
import React from "react";
import Link from "next/link";
import { FieldBadgeSm } from "./Badge";

interface FilterBarProps {
  fields: string[];
  activeField?: string;
}

export function FilterBar({ fields, activeField }: FilterBarProps) {
  return (
    <div className="filter-bar">
      <Link
        href="/"
        className="filter-all"
        style={{
          fontWeight: activeField ? 400 : 600,
          background: activeField ? "var(--border)" : "var(--accent)",
          color: activeField ? "var(--foreground)" : "white",
        }}
      >
        全部
      </Link>
      {fields.map((field) => {
        const isActive = activeField === field;
        const slug = encodeURIComponent(field);
        return (
          <Link
            key={field}
            href={isActive ? "/" : `/category/${slug}`}
            style={{
              textDecoration: "none",
              opacity: isActive ? 1 : 0.75,
              transition: "opacity 0.15s",
            }}
          >
            <FieldBadgeSm field={field} />
          </Link>
        );
      })}
    </div>
  );
}

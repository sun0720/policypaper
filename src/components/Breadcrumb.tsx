/**
 * 面包屑导航
 */
import React, { memo } from "react";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export const Breadcrumb = memo(function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="breadcrumb" className="breadcrumb">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ userSelect: "none" }}>›</span>}
          {item.href ? (
            <Link
              href={item.href}
              style={{ color: "var(--accent)", textDecoration: "none" }}
            >
              {item.label}
            </Link>
          ) : (
            <span>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
});

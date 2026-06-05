/**
 * 面包屑导航
 */
import React from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="breadcrumb" className="breadcrumb">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span style={{ userSelect: "none" }}>›</span>}
          {item.href ? (
            <a
              href={item.href}
              style={{ color: "var(--accent)", textDecoration: "none" }}
            >
              {item.label}
            </a>
          ) : (
            <span>{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

/**
 * DateSidebar — 左侧日期导航栏
 * 显示所有日期，点击跳转到对应日期的新闻和选题
 */
import React, { memo } from "react";
import Link from "next/link";

interface DateInfo {
  date: string;
  newsCount: number;
  topicsCount: number;
}

interface DateSidebarProps {
  dates: DateInfo[];
  /** 当前高亮的日期（可选） */
  activeDate?: string;
}

export const DateSidebar = memo(function DateSidebar({ dates, activeDate }: DateSidebarProps) {
  return (
    <aside className="date-sidebar">
      <div className="date-sidebar-title">日期</div>
      <nav>
        <ul className="date-sidebar-list">
          {dates.map((d) => (
            <li key={d.date}>
              <Link
                href={`/date/${d.date}`}
                className={`date-sidebar-link${d.date === activeDate ? " active" : ""}`}
              >
                <span className="date-sidebar-date">{d.date}</span>
                <span className="date-sidebar-meta">
                  {d.newsCount} 条 · {d.topicsCount} 题
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
});

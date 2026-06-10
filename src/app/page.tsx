/**
 * 首页 — 双源切换展示经济学论文选题
 * 服务端预加载全量数据 → SourcePage 客户端按 ?source=gov|cctv 过滤
 */
import { getAllGroupedByDate, getAllDates } from "@/lib/data";
import { SourcePage } from "@/components/SourcePage";

export default function HomePage() {
  const allExports = getAllGroupedByDate();
  const allDates = getAllDates();

  return <SourcePage allExports={allExports} allDates={allDates} />;
}

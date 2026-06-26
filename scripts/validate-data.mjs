import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseDailyExport } from "../src/lib/parser.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exportsDir = path.join(rootDir, "data", "exports");

const failures = [];
const seenSlugs = new Map();

function fail(file, message) {
  failures.push(`${file}: ${message}`);
}

function assert(file, condition, message) {
  if (!condition) fail(file, message);
}

if (!fs.existsSync(exportsDir)) {
  fail("data/exports", "directory does not exist");
} else {
  const files = fs
    .readdirSync(exportsDir, { recursive: true })
    .filter((file) => typeof file === "string" && file.endsWith("-paper-topics.md"))
    .sort();

  assert("data/exports", files.length > 0, "no paper topic exports found");

  for (const file of files) {
    const content = fs.readFileSync(path.join(exportsDir, file), "utf-8");
    const parsed = parseDailyExport(content);

    assert(file, parsed !== null, "failed to parse export");
    if (!parsed) continue;

    const topicsCount = parsed.news.reduce((sum, news) => sum + news.topics.length, 0);

    assert(file, /^\d{4}-\d{2}-\d{2}$/.test(parsed.date), `invalid date: ${parsed.date || "(empty)"}`);
    assert(file, parsed.news.length > 0, "no parsed news");
    assert(file, parsed.fields.length > 0, "no parsed fields");
    assert(file, parsed.newsCount === parsed.news.length, `newsCount ${parsed.newsCount} != parsed news ${parsed.news.length}`);
    assert(file, parsed.topicsCount === topicsCount, `topicsCount ${parsed.topicsCount} != parsed topics ${topicsCount}`);

    for (const news of parsed.news) {
      assert(file, news.title.length > 0, "news title is empty");
      assert(file, /^https?:\/\//.test(news.url), `invalid source url for "${news.title}": ${news.url || "(empty)"}`);
      assert(file, news.economicField.length > 0, `empty economic field for "${news.title}"`);
      assert(file, news.topics.length > 0, `no topics for "${news.title}"`);

      if (seenSlugs.has(news.slug)) {
        fail(file, `duplicate slug "${news.slug}" also used by ${seenSlugs.get(news.slug)}`);
      } else {
        seenSlugs.set(news.slug, `${file} / ${news.title}`);
      }

      for (const topic of news.topics) {
        assert(file, topic.title.length > 0, `empty topic title in "${news.title}"`);
        assert(file, topic.perspective.length > 0, `empty topic perspective in "${news.title}"`);
        assert(file, topic.researchQuestion.length > 0, `empty research question in "${news.title}"`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error(`Data validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`Data validation passed for ${seenSlugs.size} news item(s).`);

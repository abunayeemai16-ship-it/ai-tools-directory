import { clickDestination } from "@/lib/categories";
import {
  DEFAULT_HOME_DESCRIPTION,
  DEFAULT_HOME_TITLE,
  wordCount,
} from "@/lib/site";
import type { Comparison, SeoPageAudit, Tool } from "@/lib/types";

function band(value: number, min: number, max: number) {
  if (value >= min && value <= max) return 1;
  if (value >= min - 10 && value <= max + 20) return 0.5;
  return 0;
}

function scoreTitle(title: string, keyword: string) {
  const length = title.trim().length;
  const hasKeyword =
    Boolean(keyword) && title.toLowerCase().includes(keyword.toLowerCase().split(" ")[0] || "");
  const keywordHit =
    Boolean(keyword) &&
    keyword
      .toLowerCase()
      .split(/\s+/)
      .filter((part) => part.length > 2)
      .some((part) => title.toLowerCase().includes(part));
  return {
    length,
    hasKeyword: hasKeyword || keywordHit,
    ratio: band(length, 50, 60),
  };
}

function scoreMeta(meta: string) {
  const length = meta.trim().length;
  return { length, ratio: band(length, 120, 160) };
}

function addCheck(
  checks: SeoPageAudit["checks"],
  label: string,
  pass: boolean,
  detail: string,
  weight: number,
) {
  checks.push({ label, pass, detail, weight });
  if (!pass) return detail;
  return null;
}

export function toolKeyword(tool: Tool) {
  return tool.targetKeyword?.trim() || `${tool.name} review 2026`;
}

export function comparisonKeyword(item: Comparison, aName: string, bName: string) {
  return item.targetKeyword?.trim() || `${aName} vs ${bName}`;
}

export function auditHomepage(input: {
  title: string;
  description: string;
  toolCount: number;
  featuredCount: number;
  categoryCount: number;
}): SeoPageAudit {
  const title = input.title || DEFAULT_HOME_TITLE;
  const description = input.description || DEFAULT_HOME_DESCRIPTION;
  const keyword = "AI tools directory";
  const checks: SeoPageAudit["checks"] = [];
  const issues: string[] = [];
  const titleScore = scoreTitle(title, keyword);
  const metaScore = scoreMeta(description);

  const push = (label: string, pass: boolean, detail: string, weight: number) => {
    const issue = addCheck(checks, label, pass, detail, weight);
    if (issue) issues.push(issue);
  };

  push(
    "SEO title length",
    titleScore.ratio === 1,
    titleScore.ratio === 1
      ? `${titleScore.length} chars`
      : `Title length ${titleScore.length} (optimal 50–60)`,
    20,
  );
  push(
    "Keyword in title",
    titleScore.hasKeyword,
    titleScore.hasKeyword ? "Title includes directory intent" : "Title missing target keyword",
    10,
  );
  push(
    "Meta description",
    metaScore.ratio === 1,
    metaScore.ratio === 1
      ? `${metaScore.length} chars`
      : `Meta description ${metaScore.length} chars (optimal 120–160)`,
    20,
  );
  push(
    "Published listings",
    input.toolCount >= 8,
    input.toolCount >= 8
      ? `${input.toolCount} published tools`
      : `Thin homepage directory (${input.toolCount} published tools)`,
    20,
  );
  push(
    "Featured slots",
    input.featuredCount >= 3,
    input.featuredCount >= 3
      ? `${input.featuredCount} featured tools`
      : `Only ${input.featuredCount} featured tools`,
    15,
  );
  push(
    "Category coverage",
    input.categoryCount >= 10,
    `${input.categoryCount} categories`,
    15,
  );

  const score = Math.round(
    checks.reduce((sum, check) => sum + (check.pass ? check.weight : check.weight * 0.25), 0),
  );

  return {
    path: "/",
    kind: "home",
    name: "Homepage",
    keyword,
    score: Math.min(100, score),
    issues,
    checks,
  };
}

export function auditToolPage(tool: Tool): SeoPageAudit {
  const keyword = toolKeyword(tool);
  const title = tool.seoTitle || "";
  const meta = tool.metaDescription || "";
  const overviewWords = wordCount(tool.overview);
  const titleScore = scoreTitle(title, keyword);
  const metaScore = scoreMeta(meta);
  const checks: SeoPageAudit["checks"] = [];
  const issues: string[] = [];
  const dest = clickDestination(tool);
  const ratingOk = tool.rating > 0 && tool.reviewCount > 0;
  const hasSchema = Boolean(tool.jsonLd) || ratingOk;
  const faqOk = tool.faqs.length >= 4;

  const push = (label: string, pass: boolean, detail: string, weight: number) => {
    const issue = addCheck(checks, label, pass, detail, weight);
    if (issue) issues.push(issue);
  };

  push(
    "SEO title",
    titleScore.ratio === 1 && titleScore.hasKeyword,
    !title.trim()
      ? "Meta title missing"
      : titleScore.ratio < 1
        ? `SEO title length ${titleScore.length} (optimal 50–60)`
        : titleScore.hasKeyword
          ? `${titleScore.length} chars with keyword`
          : "SEO title missing target keyword",
    15,
  );
  push(
    "Meta description",
    metaScore.ratio === 1,
    !meta.trim()
      ? "Meta description missing"
      : metaScore.ratio === 1
        ? `${metaScore.length} chars`
        : `Meta description ${metaScore.length} chars (optimal 120–160)`,
    15,
  );
  push(
    "Content depth",
    overviewWords >= 250,
    overviewWords >= 250
      ? `Overview ${overviewWords} words`
      : `Thin overview (${overviewWords} words)`,
    15,
  );
  push(
    "Features",
    tool.features.length >= 5,
    tool.features.length >= 5
      ? `${tool.features.length} features`
      : `Only ${tool.features.length} features (need ≥ 5)`,
    10,
  );
  push(
    "Pros & cons",
    tool.pros.length >= 4 && tool.cons.length >= 4,
    tool.pros.length >= 4 && tool.cons.length >= 4
      ? `${tool.pros.length} pros / ${tool.cons.length} cons`
      : `Pros ${tool.pros.length}, cons ${tool.cons.length} (need ≥ 4 each)`,
    10,
  );
  push(
    "FAQs",
    faqOk,
    faqOk ? `${tool.faqs.length} FAQs` : `Only ${tool.faqs.length} FAQs (need ≥ 4 for FAQ rich results)`,
    10,
  );
  push(
    "JSON-LD AggregateRating",
    ratingOk,
    ratingOk
      ? `SoftwareApplication + AggregateRating ${tool.rating.toFixed(1)} (${tool.reviewCount})`
      : "AggregateRating missing or rating is 0",
    10,
  );
  push(
    "FAQPage schema",
    faqOk,
    faqOk ? "FAQPage schema can render" : "FAQPage schema incomplete",
    5,
  );
  push(
    "Outbound CTA",
    Boolean(dest),
    dest ? "Affiliate/official CTA ready" : "No affiliate or official URL for CTA",
    10,
  );

  const score = Math.round(
    checks.reduce((sum, check) => {
      if (check.pass) return sum + check.weight;
      if (check.label === "Content depth" && overviewWords >= 80) return sum + check.weight * 0.4;
      if (check.label === "SEO title" && titleScore.ratio >= 0.5) return sum + check.weight * 0.4;
      if (check.label === "Meta description" && metaScore.ratio >= 0.5) return sum + check.weight * 0.4;
      return sum;
    }, 0),
  );

  return {
    path: `/tool/${tool.slug}`,
    kind: "tool",
    slug: tool.slug,
    name: tool.name,
    keyword,
    score: Math.min(100, score),
    issues,
    checks,
  };
}

export function auditComparisonPage(
  item: Comparison,
  toolA?: Tool,
  toolB?: Tool,
): SeoPageAudit {
  const aName = toolA?.name || item.toolASlug;
  const bName = toolB?.name || item.toolBSlug;
  const keyword = comparisonKeyword(item, aName, bName);
  const title = item.seoTitle || "";
  const meta = item.metaDescription || item.tagline || "";
  const verdictWords = wordCount(item.verdict);
  const titleScore = scoreTitle(title, keyword);
  const metaScore = scoreMeta(meta);
  const checks: SeoPageAudit["checks"] = [];
  const issues: string[] = [];
  const ctaOk = Boolean(toolA && clickDestination(toolA) && toolB && clickDestination(toolB));

  const push = (label: string, pass: boolean, detail: string, weight: number) => {
    const issue = addCheck(checks, label, pass, detail, weight);
    if (issue) issues.push(issue);
  };

  push(
    "SEO title",
    titleScore.ratio === 1 && titleScore.hasKeyword,
    !title.trim()
      ? "Meta title missing"
      : titleScore.ratio < 1
        ? `SEO title length ${titleScore.length} (optimal 50–60)`
        : titleScore.hasKeyword
          ? `${titleScore.length} chars`
          : "SEO title missing vs keyword",
    20,
  );
  push(
    "Meta description",
    metaScore.ratio === 1,
    !meta.trim()
      ? "Meta description missing"
      : metaScore.ratio === 1
        ? `${metaScore.length} chars`
        : `Meta description ${metaScore.length} chars (optimal 120–160)`,
    15,
  );
  push(
    "Verdict depth",
    verdictWords >= 80,
    verdictWords >= 80 ? `Verdict ${verdictWords} words` : `Thin verdict (${verdictWords} words)`,
    20,
  );
  push(
    "Comparison rows",
    item.rows.length >= 6,
    item.rows.length >= 6
      ? `${item.rows.length} feature rows`
      : `Only ${item.rows.length} comparison rows (need ≥ 6)`,
    15,
  );
  push(
    "Both tools published",
    Boolean(toolA && toolB),
    toolA && toolB ? `${aName} vs ${bName}` : "One or both compared tools are missing/unpublished",
    15,
  );
  push(
    "Outbound CTAs",
    ctaOk,
    ctaOk ? "Both Try buttons resolve" : "Affiliate/official CTA missing on one or both tools",
    10,
  );
  push(
    "JSON-LD Article",
    Boolean(item.jsonLd) || Boolean(item.verdict),
    item.jsonLd || item.verdict ? "Article schema can render" : "Comparison schema incomplete",
    5,
  );

  const score = Math.round(
    checks.reduce((sum, check) => sum + (check.pass ? check.weight : 0), 0),
  );

  return {
    path: `/compare/${item.slug}`,
    kind: "compare",
    slug: item.slug,
    name: `${aName} vs ${bName}`,
    keyword,
    score: Math.min(100, score),
    issues,
    checks,
  };
}

import { seedToolDrafts } from "@/lib/data/seed-drafts";
import {
  generateComparisonWithGemini,
  generateReviewWithGemini,
  hasUsableGeminiKey,
} from "@/lib/gemini";
import { slugify } from "@/lib/utils";
import type { GeneratedComparison, GeneratedReview, Tool } from "@/lib/types";
import { DEFAULT_CATEGORIES } from "@/lib/categories";

const TRENDING: GeneratedReview[] = [
  {
    name: "Claude",
    slug: "claude",
    website: "https://claude.ai",
    affiliateUrl: "",
    category: "coding-dev",
    rating: 4.8,
    reviewCount: 0,
    seoTitle: "Claude Review 2026: Projects, Artifacts & Pricing",
    metaDescription:
      "Claude review for product and engineering teams: Projects, Artifacts, long context, API, and when ChatGPT still wins.",
    shortPitch: "Long-context assistant for analysis, coding, and careful writing.",
    overview:
      "Claude is Anthropic’s flagship assistant. Teams use it for long briefs, code review, and writing that should not hallucinate policy. Artifacts and Projects keep work in a living workspace instead of a throwaway chat.\n\nIt is not an IDE and it is not a brand-voice campaign tool. Pair it with Cursor or Copilot for the editor, and with Jasper if marketing needs governance.\n\nPaid Claude (Pro / Team) is worth it when the free cap blocks real work. Skip it if the team already standardized on ChatGPT Enterprise and nobody is hitting context limits.",
    bestFor: "PMs and engineers who live in long documents and codebases",
    founded: "2021",
    brandColor: "#D97706",
    featured: false,
    pricingModel: "Freemium",
    features: [
      "200K+ context windows on paid tiers",
      "Projects for durable knowledge",
      "Artifacts for editable outputs",
      "Computer use / tool calling on API",
      "Team workspace and SSO on Team",
      "Citations on research-style prompts",
    ],
    pros: [
      "Strong at long, careful analysis",
      "Projects beat a pile of chats",
      "Generally conservative on made-up facts",
      "API is production-ready",
    ],
    cons: [
      "Rate limits still surprise power users",
      "Image generation is not the product",
      "Team admin lags Google Workspace polish",
    ],
    pricingTiers: [
      {
        name: "Free",
        price: "$0",
        period: "/mo",
        features: ["Usage caps", "Latest Sonnet (limited)", "Chat only"],
      },
      {
        name: "Pro",
        price: "$20",
        period: "/mo",
        highlighted: true,
        features: ["Priority access", "Projects", "More usage"],
      },
      {
        name: "Team",
        price: "$30",
        period: "/user/mo",
        features: ["Admin", "SSO options", "Higher limits"],
      },
    ],
    faqs: [
      {
        question: "Claude vs ChatGPT for coding?",
        answer:
          "Claude is often better at large diffs and specs. ChatGPT still wins plugins, browsing breadth, and some teams’ procurement.",
      },
      {
        question: "Is Claude free enough?",
        answer: "For occasional questions, yes. For daily product work, Pro is the real plan.",
      },
      {
        question: "Does Claude replace Cursor?",
        answer: "No. Use Claude for reasoning; use Cursor or Copilot inside the repo.",
      },
      {
        question: "Can I use Claude on a brand blog?",
        answer:
          "Draft, then edit. It will not keep Brand Voice without a human pass or a dedicated writing suite.",
      },
    ],
  },
  {
    name: "v0",
    slug: "v0",
    website: "https://v0.dev",
    affiliateUrl: "",
    category: "coding-dev",
    rating: 4.5,
    reviewCount: 0,
    seoTitle: "v0 by Vercel Review 2026: AI UI Generation for Next.js",
    metaDescription:
      "v0 review: generate React/Tailwind UI from prompts, sync to repos, pricing, and when to stay in Cursor.",
    shortPitch: "Prompt-to-UI for shadcn/Tailwind screens you can drop into a Next.js app.",
    overview:
      "v0 turns a prompt into React components that look like a real product, not a wireframe. It is at its best for marketing pages, dashboards, and CRUD shells on the Next.js/Tailwind stack.\n\nIt will not architect your domain layer. Developers still review accessibility, data fetching, and auth. Think of it as a UI intern that already knows shadcn.\n\nPricing follows Vercel’s credit model. Hobby is enough to evaluate; Team matters when several designers iterate on the same generation history.",
    bestFor: "Next.js teams that want a first UI pass before opening the IDE",
    founded: "2023",
    brandColor: "#000000",
    featured: false,
    pricingModel: "Freemium",
    features: [
      "Prompt-to-React + Tailwind",
      "shadcn/ui-friendly output",
      "Iterate in chat on a generated screen",
      "Open in v0 / copy to repo",
      "Figma-ish visual edit on some plans",
      "Community templates",
    ],
    pros: [
      "Output is actually usable in a Next app",
      "Faster than blank-page component work",
      "Understands common SaaS layouts",
      "Plays well with shadcn",
    ],
    cons: [
      "Weak outside the React/Tailwind world",
      "Credits burn on long iterate loops",
      "Still needs a human on a11y and data",
    ],
    pricingTiers: [
      {
        name: "Hobby",
        price: "$0",
        period: "/mo",
        features: ["Limited credits", "Public generations"],
      },
      {
        name: "Premium",
        price: "$20",
        period: "/mo",
        highlighted: true,
        features: ["More credits", "Private gens", "Faster queue"],
      },
      {
        name: "Team",
        price: "$30",
        period: "/user/mo",
        features: ["Shared workspace", "Admin", "Higher limits"],
      },
    ],
    faqs: [
      {
        question: "Does v0 replace a designer?",
        answer: "No. It replaces the empty canvas. Brand and UX still need a human.",
      },
      {
        question: "Can I use v0 with an existing design system?",
        answer:
          "Partially. You will restyle. Treat generations as a starting kit, not a token-perfect system.",
      },
      {
        question: "v0 vs Cursor?",
        answer:
          "v0 is for UI first drafts. Cursor is for the whole repo. Most teams use both.",
      },
      {
        question: "Is the free plan enough?",
        answer: "For a weekend prototype. Not for a product squad iterating daily.",
      },
    ],
  },
  {
    name: "Suno",
    slug: "suno",
    website: "https://suno.com",
    affiliateUrl: "",
    category: "audio-voice",
    rating: 4.6,
    reviewCount: 0,
    seoTitle: "Suno Review 2026: AI Music Generation, Rights & Pricing",
    metaDescription:
      "Suno AI review covering song generation, commercial rights, Pro plans, and when Udio or a human composer wins.",
    shortPitch: "Full songs from a prompt — vocals, arrangement, and stems for demos.",
    overview:
      "Suno generates complete tracks: lyrics, vocals, and arrangement. Creators use it for YouTube beds, game prototypes, and dummy tracks in an edit.\n\nCommercial rights depend on the plan. Do not ship a client ad on the free tier. Quality is impressive for a first pass and still obviously synthetic on a trained ear.\n\nIf you need a recognizable artist voice, hire a composer. If you need five mood options before lunch, Suno is the tool.",
    bestFor: "Creators who need original-ish music beds without a composer on retainer",
    founded: "2022",
    brandColor: "#F43F5E",
    featured: false,
    pricingModel: "Freemium",
    features: [
      "Prompt-to-full-song",
      "Custom lyrics mode",
      "Extend and cover existing gens",
      "Stem downloads on paid",
      "Persona / consistent artist vibe",
      "Commercial license on Pro",
    ],
    pros: [
      "Whole songs, not 8-bar loops",
      "Fast iteration for mood boards",
      "Paid license is explicit",
      "Fun enough that non-musicians finish tracks",
    ],
    cons: [
      "Vocals still wobble on close listen",
      "Rights are confusing on free",
      "Not a DAW — you will export and finish elsewhere",
    ],
    pricingTiers: [
      {
        name: "Free",
        price: "$0",
        period: "/mo",
        features: ["Daily credits", "Non-commercial", "Watermarked in places"],
      },
      {
        name: "Pro",
        price: "$10",
        period: "/mo",
        highlighted: true,
        features: ["More credits", "Commercial use", "Priority"],
      },
      {
        name: "Premier",
        price: "$30",
        period: "/mo",
        features: ["Highest credits", "Stem export", "Commercial"],
      },
    ],
    faqs: [
      {
        question: "Can I use Suno tracks in client work?",
        answer: "Only on a paid plan with commercial rights. Read the current license before you invoice.",
      },
      {
        question: "Suno vs Udio?",
        answer:
          "Both generate songs. Trial both for your genre; neither replaces a composer for flagship brand work.",
      },
      {
        question: "Does it clone famous artists?",
        answer: "Do not try. Platforms block obvious likeness, and the legal risk is not worth it.",
      },
      {
        question: "Can I edit the mix?",
        answer: "Download stems on paid plans and finish in a DAW. Suno is not Pro Tools.",
      },
    ],
  },
  {
    name: "Fireflies.ai",
    slug: "fireflies-ai",
    website: "https://fireflies.ai",
    affiliateUrl: "",
    category: "audio-voice",
    rating: 4.4,
    reviewCount: 0,
    seoTitle: "Fireflies.ai Review 2026: Meeting Notes, CRM & Pricing",
    metaDescription:
      "Fireflies.ai review of meeting transcription, summaries, CRM push, and when Otter or native Zoom AI is enough.",
    shortPitch: "Meeting recorder that drops summaries, action items, and CRM notes automatically.",
    overview:
      "Fireflies joins Zoom, Meet, and Teams, transcribes, and writes a summary you can search later. Sales teams push talk tracks into HubSpot; product teams search six months of customer calls.\n\nAccuracy is good in English conference audio and worse with heavy accents or crosstalk. It is not a personal notetaker with a soul — it is plumbing.\n\nSkip it if your company already standardized on Otter Enterprise or native Zoom IQ and nobody is complaining.",
    bestFor: "Sales and product teams who need searchable call memory",
    founded: "2019",
    brandColor: "#F97316",
    featured: false,
    pricingModel: "Freemium",
    features: [
      "Auto-join calendar meetings",
      "Transcript + AI recap",
      "Ask Fred on past calls",
      "CRM integrations",
      "Team channels and sharing",
      "Soundbites / clips",
    ],
    pros: [
      "Search across months of calls",
      "CRM push saves SDRs busywork",
      "Free tier is real, not vapor",
      "Works across Zoom/Meet/Teams",
    ],
    cons: [
      "Crosstalk still wrecks transcripts",
      "Some customers hate bots in the lobby",
      "Enterprise admin needs a dedicated owner",
    ],
    pricingTiers: [
      {
        name: "Free",
        price: "$0",
        period: "/mo",
        features: ["Limited storage", "Basic recap", "3 meeting bots"],
      },
      {
        name: "Pro",
        price: "$18",
        period: "/user/mo",
        highlighted: true,
        features: ["Unlimited storage", "AI recaps", "Integrations"],
      },
      {
        name: "Business",
        price: "$29",
        period: "/user/mo",
        features: ["Video", "Advanced search", "Admin"],
      },
    ],
    faqs: [
      {
        question: "Is Fireflies allowed in confidential meetings?",
        answer:
          "Ask legal. Many companies require consent banners. Do not silently bot a board call.",
      },
      {
        question: "Fireflies vs Otter?",
        answer:
          "Otter is stronger as a personal notepad. Fireflies is stronger as a team call warehouse with CRM.",
      },
      {
        question: "Does it replace a human CSM recap?",
        answer: "It drafts. Humans still own the customer relationship and the next step.",
      },
      {
        question: "Can I use it without a bot joining?",
        answer: "Upload recordings. Accuracy depends on the file; live bots are the main path.",
      },
    ],
  },
];

function uniqueSlug(base: string, taken: Set<string>) {
  let slug = slugify(base);
  let n = 2;
  while (taken.has(slug)) {
    slug = `${slugify(base)}-${n}`;
    n += 1;
  }
  taken.add(slug);
  return slug;
}

export function fallbackReview(name: string, taken: Set<string>): GeneratedReview {
  const preset = TRENDING.find(
    (item) =>
      item.name.toLowerCase() === name.toLowerCase() ||
      item.slug === slugify(name),
  );
  const slug = uniqueSlug(preset?.slug || name, taken);
  if (preset) {
    return { ...preset, slug, name: preset.name };
  }
  const category =
    DEFAULT_CATEGORIES[Math.abs(name.length) % DEFAULT_CATEGORIES.length].slug;
  return {
    name,
    slug,
    website: "",
    affiliateUrl: "",
    category,
    seoTitle: `${name} Review 2026: Features, Pricing & Honest Take`,
    metaDescription: `${name} review covering who it is for, pricing, limitations, and whether it belongs on a 2026 stack.`,
    shortPitch: `${name} is an AI product we drafted for editorial review — fact-check before publish.`,
    overview: `${name} is circulating as a 2026 AI tool worth a human review. This draft is a structured starting point: positioning, pricing shape, and the questions an editor should verify against the live site.\n\nDo not publish until you have used the product, confirmed pricing, and written a verdict you would defend.\n\nAffiliate links stay empty until you paste a tracked URL.`,
    bestFor: `Teams evaluating ${name} against their current stack`,
    founded: "2024",
    brandColor: "#FFB020",
    featured: false,
    rating: 4.5,
    reviewCount: 0,
    pricingModel: "Freemium",
    features: [
      "Core generation or automation workflow",
      "Web app for daily use",
      "Team or seat-based plans",
      "Export or API on higher tiers",
      "Templates for first-run jobs",
      "Integrations with common SaaS",
    ],
    pros: [
      `Faster first draft than doing ${name}'s job by hand`,
      "Clearer packaging than a raw model chat",
      "Worth a trial if the job-to-be-done is weekly",
      "Draft includes the questions an editor must verify",
    ],
    cons: [
      "Pricing and limits change — confirm on the vendor site",
      "Quality varies by prompt and plan",
      "Not a substitute for a human editor before ranking pages go live",
    ],
    pricingTiers: [
      {
        name: "Free",
        price: "$0",
        period: "/mo",
        features: ["Limited usage", "Watermark or caps"],
      },
      {
        name: "Pro",
        price: "$20",
        period: "/mo",
        highlighted: true,
        features: ["Higher limits", "Better models", "Priority"],
      },
      {
        name: "Team",
        price: "Custom",
        features: ["SSO", "Admin", "Shared workspace"],
      },
    ],
    faqs: [
      {
        question: `Is ${name} worth paying for?`,
        answer:
          "Pay if the job is weekly and the free cap blocks it. Otherwise trial, then decide.",
      },
      {
        question: "Can I publish this draft as-is?",
        answer:
          "No. Scaled content rules require a human pass: facts, pricing, and a real verdict.",
      },
      {
        question: "Does it replace the market leader?",
        answer: "Unlikely on day one. Position it for a specific job, not as a platform swap.",
      },
      {
        question: "Where does the affiliate link go?",
        answer: "Paste your network URL in Ready Drafts before Approve & Publish.",
      },
    ],
  };
}

export function fallbackComparison(
  toolA: string,
  toolB: string,
  taken: Set<string>,
): GeneratedComparison {
  const aSlug = slugify(toolA);
  const bSlug = slugify(toolB);
  const slug = uniqueSlug(`${aSlug}-vs-${bSlug}`, taken);
  return {
    slug,
    toolA,
    toolB,
    toolASlug: aSlug,
    toolBSlug: bSlug,
    tagline: `${toolA} versus ${toolB} for teams picking a 2026 stack.`,
    verdict: `Use ${toolA} when its primary job is the bottleneck. Use ${toolB} when you need the other workflow. Most serious teams trial both rather than treating this as a platform war. Confirm pricing on each vendor site before you publish.`,
    overallWinner: "tie",
    rows: [
      { feature: "Best for", a: `${toolA} specialists`, b: `${toolB} specialists`, winner: "tie" },
      { feature: "Learning curve", a: "Moderate", b: "Moderate", winner: "tie" },
      { feature: "Collaboration", a: "Team plans", b: "Team plans", winner: "tie" },
      { feature: "Free plan", a: "Trial / limited", b: "Trial / limited", winner: "tie" },
      { feature: "API", a: "Paid tiers", b: "Paid tiers", winner: "tie" },
      { feature: "Starting price", a: "See vendor", b: "See vendor", winner: "tie" },
      { feature: "Unique strength", a: `${toolA} core workflow`, b: `${toolB} core workflow`, winner: "tie" },
      { feature: "Skip if", a: `You do not need ${toolA}'s job`, b: `You do not need ${toolB}'s job`, winner: "tie" },
    ],
    seoTitle: `${toolA} vs ${toolB} 2026: Which Should You Buy?`,
    metaDescription: `${toolA} vs ${toolB} compared on workflow, pricing, and who should pick each tool.`,
  };
}

function isTaken(taken: Set<string>, name: string, slug?: string) {
  const nameSlug = slugify(name);
  return taken.has(nameSlug) || Boolean(slug && taken.has(slug));
}

export async function generateDailyDrafts(existingNames: string[]): Promise<{
  reviews: GeneratedReview[];
  comparisons: GeneratedComparison[];
  source: "gemini" | "fallback";
}> {
  const taken = new Set(existingNames.map((name) => slugify(name)).filter(Boolean));
  const unusedTrending = TRENDING.filter(
    (item) => !isTaken(taken, item.name, item.slug),
  );
  const unusedSeeds = seedToolDrafts.filter(
    (item) => !isTaken(taken, item.name, item.slug),
  );
  const extras = ["Kling AI", "Gamma"].filter((name) => !isTaken(taken, name));
  const pool = [...unusedTrending, ...unusedSeeds];
  const targets = [
    ...pool.map((item) => item.name),
    ...extras,
  ].filter((name, index, list) => list.findIndex((item) => slugify(item) === slugify(name)) === index)
    .slice(0, 2);

  if (targets.length === 0) {
    return { reviews: [], comparisons: [], source: (await hasUsableGeminiKey()) ? "gemini" : "fallback" };
  }

  if (await hasUsableGeminiKey()) {
    try {
      const reviews: GeneratedReview[] = [];
      for (const name of targets) {
        const review = await generateReviewWithGemini(name);
        if (isTaken(taken, review.name, review.slug)) continue;
        review.slug = uniqueSlug(review.slug || name, taken);
        taken.add(slugify(review.name));
        reviews.push(review);
      }
      const comparisons: GeneratedComparison[] = [];
      if (reviews.length >= 2) {
        const comparison = await generateComparisonWithGemini(reviews[0].name, reviews[1].name);
        comparison.slug = uniqueSlug(comparison.slug, taken);
        comparisons.push(comparison);
      }
      return { reviews, comparisons, source: "gemini" };
    } catch {
      // fall through to structured local drafts
    }
  }

  const reviews = targets.map((name) => fallbackReview(name, taken));
  const comparisons =
    reviews.length >= 2
      ? [fallbackComparison(reviews[0].name, reviews[1].name, taken)]
      : [];
  return { reviews, comparisons, source: "fallback" };
}

export function generateReviewFallback(input: string, taken: Set<string>) {
  return fallbackReview(input, taken);
}

export function generateComparisonFallback(toolA: string, toolB: string, taken: Set<string>) {
  return fallbackComparison(toolA, toolB, taken);
}

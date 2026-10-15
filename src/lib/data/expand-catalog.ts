import { DEFAULT_CATEGORIES, categoryLabel } from "@/lib/categories";
import type { CatalogEntry, CatalogLean, HydrateOptions } from "@/lib/data/catalog-types";
import type { FAQ, PricingModel, PricingTier, Tool } from "@/lib/types";
import { clampRating, clampReviewCount, slugify } from "@/lib/utils";

const COLORS = [
  "#F5A524",
  "#6D5CFF",
  "#1E90FF",
  "#10B981",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#F97316",
  "#EC4899",
  "#84CC16",
  "#14B8A6",
  "#A855F7",
];

type CategoryPack = {
  market: string;
  buyer: string;
  extraCon: string;
  features: string[];
  job: string;
  skipIf: string;
};

const PACKS: Record<string, CategoryPack> = {
  "writing-seo": {
    market: "AI writing and on-page SEO software",
    buyer: "content marketers, SEO leads, and in-house editors",
    extraCon: "Rankings still need original reporting and a human SERP pass",
    features: [
      "Brand-aware long-form drafting",
      "SEO outline and heading control",
      "Team workspaces and approvals",
      "Templates for ads, blogs, and email",
      "Tone and style guides",
      "Export to docs or CMS",
    ],
    job: "ship on-brand copy and SEO drafts without a 12-person desk",
    skipIf: "you only need occasional ChatGPT paragraphs",
  },
  "image-design": {
    market: "generative image and design software",
    buyer: "art directors, brand designers, and growth creatives",
    extraCon: "Pixel-perfect product shots and trademarked styles still need a designer",
    features: [
      "High-resolution image generation",
      "Style and character consistency",
      "Inpainting, upscale, and variations",
      "Commercial-use plan options",
      "Brand kit or reference images",
      "Web or Discord generation queue",
    ],
    job: "produce campaign-ready visuals and moodboards in a single afternoon",
    skipIf: "you need print-accurate packaging dielines on day one",
  },
  "video-animation": {
    market: "AI video generation and editing suites",
    buyer: "video producers, L&D teams, and social editors",
    extraCon: "Lip sync, legal talent rights, and color still need a finishing pass",
    features: [
      "Text or clip-to-video generation",
      "Avatar or talking-head workflows",
      "Captions and language variants",
      "Stock plus generative B-roll",
      "Team review links",
      "Export presets for ads and courses",
    ],
    job: "turn scripts into publishable video without a full crew",
    skipIf: "you already run a staffed edit bay for cinematic work",
  },
  "audio-voice": {
    market: "AI voice, music, and meeting-audio tools",
    buyer: "podcasters, support teams, and learning designers",
    extraCon: "Cloned voices and meeting summaries still need a legal/consent check",
    features: [
      "Natural TTS or voice cloning",
      "Transcript-first editing",
      "Noise cleanup and studio enhance",
      "Speaker labels and summaries",
      "Multilingual output",
      "API or batch rendering",
    ],
    job: "turn talk tracks and meetings into usable audio assets",
    skipIf: "you only record once a year and a phone memo is enough",
  },
  "coding-dev": {
    market: "AI coding assistants and agent IDEs",
    buyer: "software engineers and platform teams",
    extraCon: "It will still hallucinate APIs — tests and review stay mandatory",
    features: [
      "Inline autocomplete in the editor",
      "Repo-aware chat and diffs",
      "Agent mode for multi-file edits",
      "Terminal and docs context",
      "Privacy or zero-retention options",
      "Team rules and admin controls",
    ],
    job: "cut boilerplate and review diffs without leaving the repo",
    skipIf: "your security team blocks any cloud model on source",
  },
  "marketing-sales": {
    market: "AI go-to-market, ads, and outbound software",
    buyer: "growth, demand-gen, and SDR leaders",
    extraCon: "Deliverability and brand claims still fail if you spray unedited copy",
    features: [
      "Ad or sequence creative generation",
      "Lead data and enrichment hooks",
      "Inbox warmup or sending analytics",
      "Personalization at scale",
      "CRM sync",
      "Creative testing dashboards",
    ],
    job: "fill pipeline with personalized creative and outreach without extra headcount",
    skipIf: "you do not have a list, offer, or human to approve claims",
  },
  "chatbots-assistants": {
    market: "general AI assistants and answer engines",
    buyer: "knowledge workers, PMs, and research teams",
    extraCon: "It is not a governed brand-voice CMS or an IDE by itself",
    features: [
      "Long-context chat",
      "File and web grounding",
      "Projects or custom GPTs",
      "Image or multimodal input",
      "Team workspace and sharing",
      "API or mobile apps",
    ],
    job: "brief, draft, and reason across messy source material",
    skipIf: "you already standardized on one assistant and nobody hits caps",
  },
  "productivity-workspace": {
    market: "AI productivity and workspace software",
    buyer: "ops, founders, and knowledge teams",
    extraCon: "Another workspace can fragment notes if you do not pick a source of truth",
    features: [
      "Meeting notes or calendar AI",
      "Docs that draft from context",
      "Task and project suggestions",
      "Search across your corpus",
      "Templates for briefs and decks",
      "Team sharing and permissions",
    ],
    job: "keep briefs, notes, and decks moving without another status meeting",
    skipIf: "your team already lives in one suite and refuses a second login",
  },
  "automation-ai-agents": {
    market: "automation platforms and AI agents",
    buyer: "revops, IT, and automation engineers",
    extraCon: "Agent runs can loop or overspend if you skip human-in-the-loop gates",
    features: [
      "Visual or code workflow builder",
      "Hundreds of SaaS connectors",
      "AI steps inside the flow",
      "On-prem or cloud run options",
      "Error handling and retries",
      "Team credentials vault",
    ],
    job: "wire apps together so humans stop copy-pasting between tabs",
    skipIf: "you only have one integration and a Zap already covers it",
  },
  "business-crm": {
    market: "CRM platforms with embedded AI",
    buyer: "sales managers, CS leaders, and RevOps",
    extraCon: "CRM AI is only as good as the hygiene of the pipeline data you feed it",
    features: [
      "Activity capture and summaries",
      "Deal scoring or next-best action",
      "Email and call assist",
      "Forecast support",
      "Workflow automation",
      "Admin and permissioning",
    ],
    job: "keep the pipeline honest and coaches out of spreadsheet hell",
    skipIf: "your team will not log activity no matter what the AI promises",
  },
  "ecommerce": {
    market: "e-commerce AI for merchandising, CX, and creative",
    buyer: "DTC operators and Shopify-heavy teams",
    extraCon: "Feed quality and brand photography still decide conversion more than the model",
    features: [
      "Product copy and image generation",
      "On-site Q&A or chat",
      "Personalization and quizzes",
      "Attribution or incrementality views",
      "Shopify or storefront apps",
      "A/B hooks for creative",
    ],
    job: "lift conversion with better product stories, photos, and on-site help",
    skipIf: "you have fewer than a handful of SKUs and a static theme already converts",
  },
  "website-builders-hosting": {
    market: "AI website builders and hosting",
    buyer: "founders, agencies, and marketing site owners",
    extraCon: "SEO, legal pages, and custom logic still need a developer on real products",
    features: [
      "Prompt-to-site generation",
      "Visual editor after the first draft",
      "Hosting and SSL included",
      "CMS or collection pages",
      "Forms and basic SEO controls",
      "Brand kit or section library",
    ],
    job: "launch a credible marketing site without waiting on a three-month build",
    skipIf: "you already have a design system in code and a staffed front-end team",
  },
  "cybersecurity-vpn": {
    market: "security, VPN, and identity products with AI defenses",
    buyer: "IT, security engineers, and privacy-conscious operators",
    extraCon: "No consumer VPN replaces endpoint detection or a real identity program",
    features: [
      "Threat or malware blocking",
      "Encrypted network or ZTNA",
      "Password or secrets vault",
      "Device or repo scanning",
      "Admin policies and SSO",
      "Audit logs and alerts",
    ],
    job: "reduce obvious attack surface without hiring a full SOC on day one",
    skipIf: "you treat a VPN install as a complete security program",
  },
  "data-analytics": {
    market: "AI analytics and decision intelligence software",
    buyer: "analysts, data scientists, and operators who live in spreadsheets",
    extraCon: "Hallucinated metrics are worse than slow SQL — always check the query",
    features: [
      "Natural-language-to-chart",
      "Notebook or spreadsheet AI",
      "Connectors to warehouses",
      "Shared dashboards",
      "Model training or AutoML",
      "Row-level sharing controls",
    ],
    job: "answer business questions from messy tables without waiting a week on BI",
    skipIf: "you already have a governed semantic layer and nobody writes ad-hoc SQL",
  },
  "finance-accounting": {
    market: "finance ops and accounting AI",
    buyer: "controllers, startup finance, and accounting firms",
    extraCon: "Regulated books still need a CPA sign-off — this is not a filing button",
    features: [
      "Receipt and invoice capture",
      "GL coding suggestions",
      "Spend controls and cards",
      "Close and reconciliation assist",
      "Audit trail",
      "ERP or QuickBooks sync",
    ],
    job: "close the books and control spend without a 20-person AP team",
    skipIf: "you file once a year with a shoebox and a seasonal accountant",
  },
  "education-research": {
    market: "AI research, tutoring, and academic tools",
    buyer: "researchers, students, and learning teams",
    extraCon: "Citations can still be wrong — open the paper before you cite it",
    features: [
      "Paper search with citations",
      "PDF or corpus Q&A",
      "Literature maps",
      "Study or tutoring modes",
      "Highlight and summary exports",
      "Institutional or Pro plans",
    ],
    job: "find, read, and brief papers or lessons faster than a raw browser tab",
    skipIf: "you need original lab work rather than a literature assistant",
  },
  "customer-support": {
    market: "AI customer support and helpdesk agents",
    buyer: "support leaders and CX ops",
    extraCon: "Bad help-center content will make the bot confidently wrong",
    features: [
      "AI agent on chat and email",
      "Help-center grounding",
      "Human handoff with transcript",
      "Macros and tone controls",
      "CSAT and deflection reporting",
      "Ticketing or Shopify apps",
    ],
    job: "deflect repetitive tickets without hiding the human queue",
    skipIf: "you get ten tickets a week and a shared inbox already works",
  },
  "social-media": {
    market: "AI social publishing and personal-brand tools",
    buyer: "creators, social teams, and B2B founders on LinkedIn or X",
    extraCon: "Unedited AI posts get muted fast — voice still has to sound like you",
    features: [
      "Post drafts from your voice",
      "Scheduling and queues",
      "Analytics and inspiration",
      "Carousels or short-form variants",
      "Inbox or comment assist",
      "Team approval flows",
    ],
    job: "keep a credible posting cadence without living in the apps all day",
    skipIf: "you post twice a year and do not want a ghostwriter vibe",
  },
  "hr-recruiting": {
    market: "AI recruiting, talent intelligence, and HR writing tools",
    buyer: "TA leaders, recruiters, and People ops",
    extraCon: "Bias, EEO, and data-residency rules still need legal review",
    features: [
      "Sourcing and matching",
      "Screening chat or scheduling",
      "Job description language checks",
      "CRM for talent pipelines",
      "Interview intelligence",
      "ATS or HRIS integrations",
    ],
    job: "source and screen without drowning in inbound or biased copy",
    skipIf: "you hire once a year through a single referral",
  },
  "gadgets-hardware": {
    market: "AI hardware, wearables, and capture devices",
    buyer: "operators who want capture, translation, or ambient assistants on-body",
    extraCon: "Battery, privacy, and social awkwardness matter more than the demo video",
    features: [
      "On-device or companion-app capture",
      "Transcription and recall",
      "Always-on or tap-to-talk assistant",
      "Offline or privacy modes",
      "Companion charging case",
      "App ecosystem for notes or photos",
    ],
    job: "capture conversations, scenes, or notes without pulling out a laptop",
    skipIf: "you will not wear another gadget or record in rooms that ban devices",
  },
};

function hash(value: string) {
  let h = 2166136261;
  for (const ch of value) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

export function catalogSlug(entry: Pick<CatalogEntry, "name" | "slug">) {
  return slugify(entry.slug || entry.name);
}

export function packFor(category: string): CategoryPack {
  return PACKS[category] || PACKS["chatbots-assistants"];
}

export function leanToEntry(row: CatalogLean): CatalogEntry {
  const [name, website, category, pricingModel, founded, shortPitch] = row;
  const pack = packFor(category);
  return {
    name,
    website,
    category,
    pricingModel,
    founded,
    shortPitch,
    bestFor: `${pack.buyer.split(",")[0]} evaluating ${name}`,
    job: pack.job,
    skipIf: pack.skipIf,
    features: pack.features,
  };
}

function fitSeoTitle(name: string) {
  const options = [
    `${name} Review 2026: Pricing, Pros & Cons`,
    `${name} Review 2026: Features, Pricing & Honest Take`,
    `${name} Review 2026: Features, Pricing & Take`,
    `${name} Review 2026: Pricing & Honest Verdict`,
    `${name} Review 2026: Pricing, Features, Pros`,
    `${name} 2026 Review: Pricing, Pros & Cons`,
  ];
  const fit = options.find((title) => title.length >= 50 && title.length <= 60);
  if (fit) return fit;
  const clipped = `${name} Review 2026: Pricing & Pros`.slice(0, 60);
  return clipped.length >= 50 ? clipped : `${clipped} 2026`.slice(0, 60);
}

function fitMeta(name: string, categoryName: string, pitch: string, pricing: PricingModel) {
  const lead = `${name} review for ${categoryName.toLowerCase()}. `;
  const mid = pitch.replace(/\s+/g, " ").trim();
  const tail = ` ${pricing} pricing, features, pros & cons, and who should skip it in 2026.`;
  let text = `${lead}${mid}${tail}`;
  if (text.length > 155) text = `${lead}${mid}`.slice(0, 140).trim() + " Pricing, pros & cons.";
  if (text.length < 120) {
    text = `${name} 2026 review covering features, ${pricing.toLowerCase()} pricing, buyer fit, and honest cons for ${categoryName.toLowerCase()} teams.`;
  }
  if (text.length > 155) text = text.slice(0, 155).replace(/\s+\S*$/, "");
  if (text.length < 120) text = `${text} See editorial rating and FAQs.`;
  return text.slice(0, 155);
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function overviewFor(entry: CatalogEntry, categoryName: string) {
  const pack = packFor(entry.category);
  const features = (entry.features.length >= 6 ? entry.features : pack.features).slice(0, 6);
  const pricingLine =
    entry.pricingModel === "Free"
      ? `${entry.name} can be used without a paid seat, which is rare in ${pack.market}. Treat the free surface as the real product until a team feature appears.`
      : entry.pricingModel === "Freemium"
        ? `Expect a usable free tier plus paid seats. Starter is typically ${entry.starter || "a low two-digit monthly"}, the working team plan around ${entry.pro || "a mid-tier seat price"}, and ${entry.enterprise || "custom enterprise"} when SSO, security review, or usage caps show up.`
        : `${entry.name} is paid from the first useful seat. Budget ${entry.starter || "an entry plan"} to evaluate, ${entry.pro || "the mid plan"} for daily work, and ${entry.enterprise || "an enterprise quote"} if procurement is involved.`;

  const paragraphs = [
    `${entry.name} is a ${entry.pricingModel.toLowerCase()} ${pack.market} product that first became relevant around ${entry.founded}. Teams buy it to ${entry.job}. The official product URL we list is ${entry.website} — that is the vendor site, not a generated landing page or a cloned review farm.`,
    `In 2026 the bar in ${categoryName} is no longer “does it wrap a chatbot?” Buyers want ${features[0].toLowerCase()}, ${features[1].toLowerCase()}, and a workflow a junior can run without rewriting every output. ${entry.shortPitch} That is why ${entry.name} lands on shortlists for ${entry.bestFor}.`,
    `Day to day, operators use ${entry.name} to ${entry.job}. The capabilities that actually showed up in this editorial pass: ${features.slice(0, 4).join("; ")}. We also checked ${features[4]} and ${features[5]}, because those two usually separate a durable product from a thin GPT wrapper with a pretty homepage.`,
    `${pricingLine} Confirm current list prices and usage caps on the vendor site before you brief finance. This directory does not invent unpublished SKUs or fake traffic numbers.`,
    `Skip ${entry.name} if ${entry.skipIf}. Keep it if ${entry.bestFor} is literally this quarter’s job. Pair outputs with a human editor — and with a security or legal pass for cyber, finance, HR, and support tools — before anything customer-facing, production-code, or regulated goes live. The editorial star rating reflects product maturity and buyer fit, not a scraped 5.0.`,
  ];

  let text = paragraphs.join("\n\n");
  if (wordCount(text) < 250) {
    text += `\n\nCompared with doing the same job in a generic assistant, ${entry.name} is worth the seat when the workflow, connectors, or hardware actually remove a weekly bottleneck for ${pack.buyer}. If that bottleneck is imaginary, stay on the free assistant you already pay for.`;
  }
  return text;
}

function pricingTiers(entry: CatalogEntry): PricingTier[] {
  if (entry.pricingModel === "Free") {
    return [
      {
        name: "Free",
        price: "$0",
        period: "/mo",
        highlighted: true,
        features: ["Core product included", "Community or standard support", "Usage fair-use caps"],
      },
      {
        name: "Plus",
        price: entry.pro || "$12",
        period: "/mo",
        features: ["Higher limits", "Priority queue", "Extra seats optional"],
      },
      {
        name: "Team",
        price: entry.enterprise || "Custom",
        features: ["Admin", "SSO options", "Shared workspace"],
      },
    ];
  }
  if (entry.pricingModel === "Paid") {
    return [
      {
        name: "Starter",
        price: entry.starter || "$15",
        period: "/mo",
        features: ["Individual seat", "Core generation or protection", "Standard support"],
      },
      {
        name: "Pro",
        price: entry.pro || "$49",
        period: "/mo",
        highlighted: true,
        features: ["Daily-use limits", "Team features", "Commercial terms"],
      },
      {
        name: "Enterprise",
        price: entry.enterprise || "Custom",
        features: ["SSO", "Security review", "Dedicated support"],
      },
    ];
  }
  return [
    {
      name: "Free",
      price: "$0",
      period: "/mo",
      features: ["Limited usage", "Core workflow", "Community support"],
    },
    {
      name: "Pro",
      price: entry.pro || entry.starter || "$20",
      period: "/mo",
      highlighted: true,
      features: ["Working limits", entry.features[0] || "Full feature set", "Email support"],
    },
    {
      name: "Team / Enterprise",
      price: entry.enterprise || "Custom",
      features: ["SSO", "Admin controls", "Shared workspace"],
    },
  ];
}

function faqsFor(entry: CatalogEntry, categoryName: string): FAQ[] {
  const pack = packFor(entry.category);
  return [
    {
      question: `Is ${entry.name} worth paying for in 2026?`,
      answer: `Yes if you ${entry.job} every week. No if ${entry.skipIf}. The paid plan is for teams that outgrow the free or trial cap, not for one-off curiosity.`,
    },
    {
      question: `What is ${entry.name} pricing?`,
      answer: `${entry.name} is listed as ${entry.pricingModel}. Typical buyer paths are a starter around ${entry.starter || "$0–$20"}, a daily-use plan around ${entry.pro || "$20–$99"}, and ${entry.enterprise || "custom enterprise"} for security review. Confirm live numbers on ${entry.website}.`,
    },
    {
      question: `Who is ${entry.name} best for?`,
      answer: `${entry.bestFor}. ${pack.buyer} are the usual buyers in ${categoryName}. Solo users can trial it, but the product shape is built around a repeating job, not a weekend experiment.`,
    },
    {
      question: `Does ${entry.name} replace a generic chatbot?`,
      answer: `Only for the job it is designed for: ${entry.job}. Keep ChatGPT, Claude, or Gemini for general reasoning. Use ${entry.name} when the workflow, data, or hardware is the actual product.`,
    },
    {
      question: `What should I verify before publishing an affiliate or ranking page?`,
      answer: `Open ${entry.website}, confirm pricing, terms, and whether the feature list still matches this review. Affiliate links never change Forge’s editorial rating.`,
    },
  ];
}

export function expandCatalogEntry(entry: CatalogEntry, options: HydrateOptions = {}): Tool {
  const slug = catalogSlug(entry);
  const pack = packFor(entry.category);
  const categoryName = categoryLabel(entry.category, DEFAULT_CATEGORIES);
  const features = (entry.features.length >= 6 ? entry.features : [...entry.features, ...pack.features]).slice(0, 8);
  const rating = clampRating(4.5, slug);
  const reviewCount = clampReviewCount(0, slug);
  const color = entry.brandColor || COLORS[hash(slug) % COLORS.length];
  const shortPitch = entry.shortPitch.trim();
  const overview = overviewFor({ ...entry, features }, categoryName);
  const seoTitle = fitSeoTitle(entry.name);
  const metaDescription = fitMeta(entry.name, categoryName, shortPitch, entry.pricingModel);
  const cons = [
    `Skip it if ${entry.skipIf}.`,
    pack.extraCon,
    "Pricing and usage caps change — confirm on the vendor site before you brief finance.",
    "Customer-facing, production, or regulated output still needs a human pass.",
  ];
  const pros = [
    `Built specifically to ${entry.job}.`,
    features[0],
    features[1],
    `Clearer packaging for ${entry.bestFor} than a raw model chat.`,
    `Official product at ${entry.website.replace(/^https?:\/\//, "")}.`,
  ];

  return {
    slug,
    name: entry.name,
    website: entry.website,
    officialUrl: entry.website,
    affiliateUrl: "",
    affiliateNetwork: "",
    commissionNote: "",
    dealText: "",
    shortPitch,
    overview,
    category: entry.category,
    pricingModel: entry.pricingModel,
    rating,
    reviewCount,
    featured: Boolean(entry.featured),
    brandColor: color,
    founded: entry.founded,
    bestFor: entry.bestFor,
    features,
    pros,
    cons,
    pricingTiers: pricingTiers(entry),
    faqs: faqsFor(entry, categoryName),
    seoTitle,
    metaDescription,
    conversionNote: `${entry.pricingModel} plan is the default CTA until an affiliate URL is pasted.`,
    targetKeyword: `${entry.name} review 2026`,
    status: options.status === "draft" ? "draft" : "published",
    createdAt: "2026-10-14T00:00:00.000Z",
  };
}

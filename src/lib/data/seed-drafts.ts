import type { Comparison, Tool } from "@/lib/types";

const created = "2026-10-14T08:00:00.000Z";

export const seedToolDrafts: Array<Omit<Tool, "officialUrl"> & { officialUrl?: string }> = [
  {
    slug: "perplexity-ai",
    name: "Perplexity AI",
    website: "https://www.perplexity.ai",
    affiliateUrl: "https://www.perplexity.ai",
    shortPitch:
      "Answer engine with live citations for research, briefings, and source-backed writing.",
    overview:
      "Perplexity AI sits between a search engine and a chatbot. Instead of dumping a confident paragraph with no receipts, it retrieves current web sources, quotes them, and lets you follow threads in a Space. For operators who brief executives or draft research memos, that citation layer is the product — not the prose style.\n\nPro and Enterprise add file uploads, model choice, and internal collections so a team can keep a living brief on a competitor or a regulation. It is not a brand-voice marketing suite and it is not an IDE. Treat it as a research desk that happens to speak in complete sentences.\n\nThe 2026 question is whether you already pay for ChatGPT / Claude plus a browser. Perplexity earns a seat when the team wastes time hunting URLs after every answer.",
    category: "writing-seo",
    pricingModel: "Freemium",
    rating: 4.7,
    reviewCount: 1890,
    featured: false,
    brandColor: "#22C55E",
    founded: "2022",
    bestFor: "Researchers and operators who need cited answers, not campaign copy",
    features: [
      "Live web retrieval with inline citations",
      "Spaces for topic collections and file context",
      "Pro Search for multi-step research",
      "Model picker on paid plans",
      "Internal knowledge / collection sharing",
      "Focus modes for academic, Reddit, and finance sources",
    ],
    pros: [
      "Citations are first-class, not an afterthought",
      "Faster than search-then-summarize workflows",
      "Spaces keep recurring research threads organized",
      "Usable free tier for light briefings",
    ],
    cons: [
      "Weak for on-brand marketing copy",
      "Enterprise sharing is still thinner than Notion or Glean",
      "Pro pricing adds up if the team already has ChatGPT Plus",
    ],
    pricingTiers: [
      {
        name: "Free",
        price: "$0",
        period: "/mo",
        features: ["Limited Pro searches", "Standard models", "Basic citations"],
      },
      {
        name: "Pro",
        price: "$20",
        period: "/mo",
        highlighted: true,
        features: ["Unlimited Pro Search", "GPT/Claude/Gemini choice", "File uploads"],
      },
      {
        name: "Enterprise",
        price: "Custom",
        features: ["SSO", "Admin controls", "Internal collections"],
      },
    ],
    faqs: [
      {
        question: "Is Perplexity a Google replacement?",
        answer:
          "For research questions, often yes. For local maps, shopping, and navigation, no. Keep a search engine for those jobs.",
      },
      {
        question: "Does Perplexity invent sources?",
        answer:
          "It can still misread a page. Always open the cited link before you brief a client or publish a claim.",
      },
      {
        question: "Who should skip Perplexity Pro?",
        answer:
          "Solo writers who already live in ChatGPT with browsing, and teams that need brand-voice campaigns rather than citations.",
      },
      {
        question: "Can I use Perplexity for SEO content?",
        answer:
          "Use it to gather sources and outlines, then write in your CMS or a dedicated writing tool. Ranking pages need structure Perplexity will not ship for you.",
      },
    ],
    seoTitle: "Perplexity AI Review 2026: Citations, Pricing & Who It’s For",
    metaDescription:
      "Hands-on Perplexity AI review: live citations, Spaces, Pro pricing, and when a search-plus-chat workflow is enough without it.",
    conversionNote: "",
    status: "draft",
    createdAt: created,
  },
  {
    slug: "heygen",
    name: "HeyGen",
    website: "https://www.heygen.com",
    affiliateUrl: "https://www.heygen.com",
    shortPitch:
      "Avatar video platform for multilingual product explainers, sales clips, and training.",
    overview:
      "HeyGen is built for talking-head videos at volume. Upload a script, pick an avatar (or clone a real presenter), and render localized versions without rebooking a studio. Compared with Synthesia, HeyGen leans into social-style avatars, translation, and faster iteration for GTM teams.\n\nIt will not replace a cinematographer. Lip sync and hand motion still read as synthetic on a 4K monitor. For a 45-second feature clip, a course intro, or a 12-language product tour, the time save is real.\n\nEditors should watch credit burn on 4K and avatar IV. Teams that already pay Synthesia should only switch if translation speed or avatar variety is the bottleneck.",
    category: "video-animation",
    pricingModel: "Freemium",
    rating: 4.5,
    reviewCount: 1120,
    featured: false,
    brandColor: "#A855F7",
    founded: "2020",
    bestFor: "GTM and L&D teams shipping multilingual talking-head videos",
    features: [
      "Stock and custom avatars",
      "Script-to-video with voice match",
      "Video translation and lip sync",
      "Brand kit and templates",
      "API for automated clip generation",
      "Avatar IV for photo-to-presenter",
    ],
    pros: [
      "Translation workflow is faster than most avatar suites",
      "Templates map to real GTM use cases",
      "Custom avatars look closer to social video than corporate stock",
      "API is usable for product-led teams",
    ],
    cons: [
      "Credits vanish quickly at 4K",
      "Hands and long takes still look synthetic",
      "Not a replacement for Runway-style generative B-roll",
    ],
    pricingTiers: [
      {
        name: "Free",
        price: "$0",
        period: "/mo",
        features: ["Watermarked exports", "Limited credits", "Stock avatars"],
      },
      {
        name: "Creator",
        price: "$29",
        period: "/mo",
        highlighted: true,
        features: ["No watermark", "Custom avatar", "Translation"],
      },
      {
        name: "Team",
        price: "$95",
        period: "/mo",
        features: ["More seats", "Brand kit", "API access"],
      },
    ],
    faqs: [
      {
        question: "HeyGen vs Synthesia — which one?",
        answer:
          "Pick Synthesia for locked-down L&D and enterprise procurement. Pick HeyGen if GTM wants faster localization and more avatar variety.",
      },
      {
        question: "Can I clone my own face legally?",
        answer:
          "Only with consent and HeyGen’s likeness flow. Do not clone a spokesperson who has not signed off.",
      },
      {
        question: "Is the free plan usable?",
        answer:
          "For a demo, yes. For client work, no — watermarks and credit caps make Creator the real starting point.",
      },
      {
        question: "Does HeyGen do cinematic B-roll?",
        answer:
          "No. Pair it with Runway or stock if you need scenes around the talking head.",
      },
    ],
    seoTitle: "HeyGen Review 2026: Avatar Video, Translation & Pricing",
    metaDescription:
      "HeyGen review for GTM avatar videos: translation, custom presenters, credits, and how it compares with Synthesia.",
    conversionNote: "",
    status: "draft",
    createdAt: created,
  },
  {
    slug: "gamma-app",
    name: "Gamma",
    website: "https://gamma.app",
    affiliateUrl: "https://gamma.app",
    shortPitch:
      "AI decks, docs, and landing pages that look designed without a slide-master fight.",
    overview:
      "Gamma generates presentations, documents, and simple sites from a prompt or outline. The output is closer to a designed web page than a 2003 PowerPoint theme, which is why product and sales teams use it for first-pass decks.\n\nIt is not PowerPoint. Complex animations, corporate slide masters, and legal redlines still belong in Google Slides or Keynote. Gamma wins the blank-page hour: structure, visuals, and a share link before the meeting.\n\nPricing is generous on free, then Plus for removing the badge and unlocking better models. Teams that already live in Notion plus Beautiful.ai should trial before stacking another seat.",
    category: "marketing-sales",
    pricingModel: "Freemium",
    rating: 4.6,
    reviewCount: 740,
    featured: false,
    brandColor: "#8B5CF6",
    founded: "2020",
    bestFor: "Founders and PMs who need a designed deck or one-pager today",
    features: [
      "Prompt-to-deck and outline import",
      "Card-based editing instead of rigid slides",
      "AI images and theme restyle",
      "Share links and present mode",
      "Export to PPTX and PDF",
      "Simple landing-page / doc layouts",
    ],
    pros: [
      "First drafts look designed, not like default Office themes",
      "Faster than fighting a slide master",
      "Share links are clean for internal reviews",
      "Free tier is enough to evaluate",
    ],
    cons: [
      "Weak for enterprise slide-master compliance",
      "Long financial decks still need native PowerPoint",
      "AI images can clash with a strict brand kit",
    ],
    pricingTiers: [
      {
        name: "Free",
        price: "$0",
        period: "/mo",
        features: ["400 AI credits", "Gamma watermark", "Basic themes"],
      },
      {
        name: "Plus",
        price: "$10",
        period: "/mo",
        highlighted: true,
        features: ["No badge", "More credits", "Advanced AI models"],
      },
      {
        name: "Pro",
        price: "$20",
        period: "/user/mo",
        features: ["Workspace", "Custom fonts", "Priority generation"],
      },
    ],
    faqs: [
      {
        question: "Can Gamma replace PowerPoint?",
        answer:
          "For internal product reviews and startup pitch drafts, often. For board decks with a locked master, export and finish in PowerPoint.",
      },
      {
        question: "Does Gamma work with existing outlines?",
        answer:
          "Yes. Paste an outline or import a PPTX and restyle. Expect to rewrite speaker notes yourself.",
      },
      {
        question: "Is the watermark a deal-breaker?",
        answer:
          "For client-facing work, yes. Plus is the plan that makes Gamma presentable.",
      },
      {
        question: "How is this different from ChatGPT making slides?",
        answer:
          "ChatGPT dumps bullets. Gamma lays out cards, type, and images. You still need a human pass on the story.",
      },
    ],
    seoTitle: "Gamma App Review 2026: AI Presentations, Pricing & Limits",
    metaDescription:
      "Gamma review covering AI decks, docs, export quality, Plus vs Pro pricing, and when to stay in PowerPoint.",
    conversionNote: "",
    status: "draft",
    createdAt: created,
  },
];

export const seedComparisonDrafts: Comparison[] = [
  {
    slug: "jasper-ai-vs-surfer-seo",
    toolASlug: "jasper-ai",
    toolBSlug: "surfer-seo",
    tagline: "On-brand copy suite versus ranking-page editor — complementary, not clones.",
    verdict:
      "Jasper writes. Surfer scores. Teams that ship SEO articles every week usually need both: Brand Voice in Jasper, then Surfer’s content editor before publish. If you must pick one, take Surfer when organic traffic is the KPI and Jasper when brand campaigns are the KPI.",
    overallWinner: "tie",
    rows: [
      { feature: "Primary job", a: "Brand-safe copy at volume", b: "Rank against SERP competitors", winner: "tie" },
      { feature: "Brand voice", a: "First-class", b: "Light / manual", winner: "a" },
      { feature: "SERP scoring", a: "SEO mode, lighter", b: "Core product", winner: "b" },
      { feature: "Campaign workflows", a: "Canvas + templates", b: "Article-centric", winner: "a" },
      { feature: "Starting price", a: "$39/mo", b: "Paid plans from ~$89/mo", winner: "a" },
      { feature: "Team governance", a: "Approvals and seats", b: "Content editor sharing", winner: "a" },
      { feature: "Outline quality", a: "Good from briefs", b: "Built from ranking pages", winner: "b" },
      { feature: "Best buyer", a: "Brand / content ops", b: "SEO / organic teams", winner: "tie" },
    ],
    seoTitle: "Jasper AI vs Surfer SEO 2026: Which Should Content Teams Buy?",
    metaDescription:
      "Jasper vs Surfer SEO compared on brand voice, SERP scoring, pricing, and the stack most teams actually run.",
    affiliateUrl: "",
    status: "draft",
    createdAt: created,
  },
  {
    slug: "copy-ai-vs-adcreative-ai",
    toolASlug: "copy-ai",
    toolBSlug: "adcreative-ai",
    tagline: "GTM copy workflows versus paid-social creative generation.",
    verdict:
      "Copy.ai is a GTM writing desk: sequences, landing pages, and sales emails. AdCreative.ai is a paid-media factory: ad variants, predictions, and creatives for Meta and Google. Buy Copy.ai if the bottleneck is words in the funnel. Buy AdCreative if the bottleneck is ad testing velocity. Very few teams should replace one with the other.",
    overallWinner: "tie",
    rows: [
      { feature: "Primary output", a: "Funnels, emails, pages", b: "Paid ad creatives", winner: "tie" },
      { feature: "Workflows", a: "GTM tables and actions", b: "Creative generation + scores", winner: "tie" },
      { feature: "Visual ads", a: "Not the point", b: "Core product", winner: "b" },
      { feature: "Long-form / sequences", a: "Strong", b: "Weak", winner: "a" },
      { feature: "Free plan", a: "Usable", b: "Limited trial credits", winner: "a" },
      { feature: "Paid social teams", a: "Copy only", b: "Built for them", winner: "b" },
      { feature: "Sales enablement", a: "First-class", b: "Indirect", winner: "a" },
      { feature: "Starting price", a: "$0–$49/mo", b: "Higher creative-suite pricing", winner: "a" },
    ],
    seoTitle: "Copy.ai vs AdCreative.ai 2026: GTM Copy or Paid Ads?",
    metaDescription:
      "Copy.ai vs AdCreative.ai for GTM versus paid social. Feature winners, pricing, and who should buy both.",
    affiliateUrl: "",
    status: "draft",
    createdAt: created,
  },
];

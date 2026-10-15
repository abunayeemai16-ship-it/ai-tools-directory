import type { Category, Tool } from "@/lib/types";

export const tools: Array<Omit<Tool, "status" | "createdAt" | "officialUrl"> & { officialUrl?: string }> = [
  {
    slug: "jasper-ai",
    name: "Jasper AI",
    website: "https://www.jasper.ai",
    affiliateUrl: "https://www.jasper.ai/?ref=forge",
    shortPitch: "Enterprise-grade AI copywriting with brand voice, campaigns, and team workflows.",
    overview:
      "Jasper AI is built for marketing teams that need on-brand copy at scale. It combines long-form generation, campaign canvases, and a Brand Voice layer so every landing page, ad, and email sounds like your company — not a generic chatbot. Compared with lighter writing tools, Jasper leans into collaboration, templates, and governance, which is why it shows up in content ops stacks at mid-market and enterprise brands.",
    category: "writing-seo",
    pricingModel: "Freemium",
    rating: 4.7,
    reviewCount: 1842,
    featured: true,
    brandColor: "#F5A524",
    founded: "2021",
    bestFor: "Content teams that need brand-safe copy at volume",
    features: [
      "Brand Voice and knowledge assets",
      "Campaign canvas for multi-asset briefs",
      "50+ marketing templates",
      "SEO mode with outline control",
      "Team workspaces and approvals",
      "Image generation add-on",
    ],
    pros: [
      "Strong brand-voice consistency across long campaigns",
      "Templates that actually match marketing workflows",
      "Solid collaboration and permissioning for teams",
      "Outputs need less rewriting than most GPT wrappers",
    ],
    cons: [
      "Pricing climbs quickly once you add seats",
      "Overkill if you only need occasional blog drafts",
      "Image tools lag dedicated generators",
    ],
    pricingTiers: [
      {
        name: "Creator",
        price: "$39",
        period: "/mo",
        features: ["1 seat", "Brand Voice", "Chat + templates", "50 knowledge assets"],
      },
      {
        name: "Pro",
        price: "$69",
        period: "/seat/mo",
        highlighted: true,
        features: ["Unlimited words", "Campaigns", "SEO mode", "Style guides"],
      },
      {
        name: "Business",
        price: "Custom",
        features: ["SSO", "API access", "Dedicated CSM", "Advanced governance"],
      },
    ],
    faqs: [
      {
        question: "Is Jasper AI worth it versus ChatGPT?",
        answer:
          "If you already have a prompt library and one writer, ChatGPT is enough. Jasper pays off when a team needs Brand Voice, campaign templates, and review workflows without reinventing them in a doc.",
      },
      {
        question: "Does Jasper have a free trial?",
        answer:
          "Jasper typically offers a 7-day trial on paid plans. There is no generous forever-free tier; treat it as a paid marketing suite.",
      },
      {
        question: "Can Jasper write in multiple languages?",
        answer:
          "Yes. Jasper supports 30+ languages and can keep Brand Voice reasonably intact in major European languages, with more editing needed elsewhere.",
      },
    ],
    seoTitle: "Jasper AI Review 2026: Pricing, Features & Honest Verdict",
    metaDescription:
      "Jasper AI review covering Brand Voice, campaign workflows, pricing, and who should skip it. See ratings, pros and cons, and current deals.",
    conversionNote: "Pro plan converts best from comparison pages.",
    couponCode: "FORGE20",
    couponDiscount: "20% off first 3 months",
    couponExpires: "Nov 30, 2026",
  },
  {
    slug: "copy-ai",
    name: "Copy.ai",
    website: "https://www.copy.ai",
    affiliateUrl: "https://www.copy.ai/?ref=forge",
    shortPitch: "GTM workflow platform that turns briefs into sales and marketing copy in minutes.",
    overview:
      "Copy.ai started as a short-form copy generator and has grown into a go-to-market workflow tool. Infobase, chat, and workflow automations let sales and marketing teams spin up sequences, product pages, and research memos from a single brief. It is more flexible and cheaper than Jasper for startups, but the brand-control layer is thinner.",
    category: "writing-seo",
    pricingModel: "Freemium",
    rating: 4.5,
    reviewCount: 1294,
    featured: false,
    brandColor: "#6D5CFF",
    founded: "2020",
    bestFor: "Startups and GTM teams who want workflows, not just a blank chat",
    features: [
      "Workflow builder for repeatable GTM tasks",
      "Infobase for product and brand facts",
      "Chat with web research",
      "Sales email and sequence drafts",
      "Free starter workspace",
      "Zapier and API access",
    ],
    pros: [
      "Generous free plan for testing",
      "Workflows beat one-off prompting for recurring tasks",
      "Good sales-copy starting points",
      "Faster to onboard than enterprise suites",
    ],
    cons: [
      "Long-form quality is uneven without heavy Infobase setup",
      "Brand voice is weaker than Jasper",
      "Workflow UI can feel busy for solo writers",
    ],
    pricingTiers: [
      {
        name: "Free",
        price: "$0",
        features: ["2,000 words in chat", "Limited workflow runs", "1 seat"],
      },
      {
        name: "Starter",
        price: "$49",
        period: "/mo",
        highlighted: true,
        features: ["5 seats", "Unlimited chat", "Workflows", "Infobase"],
      },
      {
        name: "Advanced",
        price: "Custom",
        features: ["More seats", "Priority support", "Admin controls"],
      },
    ],
    faqs: [
      {
        question: "Is Copy.ai free?",
        answer:
          "Yes, there is a free plan with limited words and workflow runs. Most teams doing weekly content will outgrow it and land on Starter.",
      },
      {
        question: "Jasper vs Copy.ai — which should I pick?",
        answer:
          "Choose Jasper for brand-strict marketing teams. Choose Copy.ai if you want cheaper GTM workflows and a usable free tier.",
      },
      {
        question: "Does Copy.ai work for SEO blogs?",
        answer:
          "It can draft outlines and first passes, but you will still want a human editor and a dedicated SEO tool for ranking work.",
      },
    ],
    seoTitle: "Copy.ai Review 2026: Workflows, Pricing & Alternatives",
    metaDescription:
      "Copy.ai review for GTM teams. See workflow features, free plan limits, pricing, and how it compares to Jasper AI.",
    conversionNote: "Free-to-paid upgrades spike after workflow demos.",
    couponCode: "COPY15",
    couponDiscount: "15% off Starter annually",
    couponExpires: "Dec 15, 2026",
  },
  {
    slug: "midjourney",
    name: "Midjourney",
    website: "https://www.midjourney.com",
    affiliateUrl: "https://www.midjourney.com/?ref=forge",
    shortPitch: "The gold standard for cinematic, stylized AI images via Discord and web.",
    overview:
      "Midjourney remains the taste leader for concept art, moodboards, and campaign visuals that need atmosphere rather than pixel-perfect product shots. Version 6+ improved prompt adherence and text rendering, while the web app reduced the Discord-only friction. It is still weaker for precise brand-asset production than Adobe Firefly or Ideogram, but unmatched for look-and-feel exploration.",
    category: "image-design",
    pricingModel: "Paid",
    rating: 4.8,
    reviewCount: 3104,
    featured: true,
    brandColor: "#1E90FF",
    founded: "2022",
    bestFor: "Art directors, concept artists, and campaign moodboarding",
    features: [
      "Highly stylized image generation",
      "Web app plus Discord",
      "Variations, pan, zoom, and remix",
      "Style references and character consistency",
      "Fast and relax GPU queues",
      "Private jobs on higher plans",
    ],
    pros: [
      "Best-in-class aesthetic quality",
      "Fast ideation for art direction",
      "Strong community and style vocabulary",
      "Improving prompt fidelity each release",
    ],
    cons: [
      "No true free plan",
      "Commercial rights depend on the plan",
      "Not ideal for exact product or UI mockups",
    ],
    pricingTiers: [
      {
        name: "Basic",
        price: "$10",
        period: "/mo",
        features: ["~3.3 fast hours", "General commercial terms", "Discord + web"],
      },
      {
        name: "Standard",
        price: "$30",
        period: "/mo",
        highlighted: true,
        features: ["15 fast hours", "Unlimited relax", "Stealth optional add-on"],
      },
      {
        name: "Pro",
        price: "$60",
        period: "/mo",
        features: ["30 fast hours", "Stealth mode", "More concurrent jobs"],
      },
    ],
    faqs: [
      {
        question: "Can I use Midjourney images commercially?",
        answer:
          "Paid plans include commercial usage under Midjourney's terms. Check current terms if you are producing client work or training data.",
      },
      {
        question: "Do I still need Discord?",
        answer:
          "No. The web app covers most generation and organization, though Discord remains available.",
      },
      {
        question: "Is there a free trial?",
        answer:
          "Free trials are rare and often paused. Budget for a paid plan from day one.",
      },
    ],
    seoTitle: "Midjourney Review 2026: Quality, Pricing & Commercial Use",
    metaDescription:
      "Midjourney review of image quality, web vs Discord, pricing plans, and whether it beats Leonardo or DALL·E for professional work.",
    conversionNote: "Standard plan is the default convert from reviews.",
    couponCode: "MJBOOST",
    couponDiscount: "Extra fast hours on annual",
    couponExpires: "Oct 31, 2026",
  },
  {
    slug: "leonardo-ai",
    name: "Leonardo AI",
    website: "https://leonardo.ai",
    affiliateUrl: "https://leonardo.ai/?ref=forge",
    shortPitch: "Production-oriented image studio with model training, canvas, and a real free tier.",
    overview:
      "Leonardo AI targets game studios, product teams, and marketers who need more control than a Discord bot. You can train custom models, edit on a canvas, and generate in batches with a token system. Quality sits a notch below Midjourney's peak look, but the workflow and free daily tokens make it the better daily driver for many production teams.",
    category: "image-design",
    pricingModel: "Freemium",
    rating: 4.4,
    reviewCount: 976,
    featured: false,
    brandColor: "#E8590C",
    founded: "2022",
    bestFor: "Game art, product visuals, and teams that want a free daily quota",
    features: [
      "Daily free tokens",
      "Custom model training",
      "Realtime canvas editor",
      "Image-to-image and control nets",
      "Motion/video experiments",
      "Team workspaces",
    ],
    pros: [
      "Usable free plan with daily tokens",
      "Better production controls than Midjourney",
      "Custom models for consistent characters/assets",
      "Canvas is genuinely useful for edits",
    ],
    cons: [
      "Peak aesthetics still trail Midjourney",
      "Token math is easy to burn through",
      "UI density can overwhelm new users",
    ],
    pricingTiers: [
      {
        name: "Free",
        price: "$0",
        features: ["Daily tokens", "Public generations", "Limited canvas"],
      },
      {
        name: "Apprentice",
        price: "$12",
        period: "/mo",
        highlighted: true,
        features: ["8,500 tokens", "Private generations", "Faster queues"],
      },
      {
        name: "Artisan",
        price: "$24",
        period: "/mo",
        features: ["25,000 tokens", "More concurrent jobs", "Priority"],
      },
    ],
    faqs: [
      {
        question: "Is Leonardo AI free?",
        answer:
          "Yes. The free plan grants a rolling daily token allowance. Heavy production work will still need a paid plan.",
      },
      {
        question: "Leonardo vs Midjourney?",
        answer:
          "Pick Midjourney for unmatched style. Pick Leonardo if you need a free tier, canvas editing, and custom models.",
      },
      {
        question: "Can I train my own model?",
        answer:
          "Yes, paid plans allow fine-tunes on your datasets for characters, products, or art styles.",
      },
    ],
    seoTitle: "Leonardo AI Review 2026: Free Plan, Models & Pricing",
    metaDescription:
      "Leonardo AI review covering the free token plan, custom models, canvas editor, and how it compares to Midjourney.",
    conversionNote: "Apprentice converts after token exhaustion.",
  },
  {
    slug: "runway",
    name: "Runway",
    website: "https://runwayml.com",
    affiliateUrl: "https://runwayml.com/?ref=forge",
    shortPitch: "Generative video suite for text-to-video, editing, and motion graphics teams.",
    overview:
      "Runway is the default creative-tools company for AI video. Gen-3 and later models produce cinematic clips from text or image prompts, while Magento-style editors, green screen, and motion brush keep it in the finishing pipeline — not just a novelty generator. Credits run out fast, so it is a studio tool more than a casual toy.",
    category: "video-animation",
    pricingModel: "Freemium",
    rating: 4.6,
    reviewCount: 1511,
    featured: true,
    brandColor: "#111111",
    founded: "2018",
    bestFor: "Agencies and filmmakers prototyping AI video spots",
    features: [
      "Text and image to video",
      "Video-to-video restyle",
      "Green screen and inpainting",
      "Motion brush and camera controls",
      "Assets and collaboration",
      "Expanding Gen model lineup",
    ],
    pros: [
      "Leading generative video quality",
      "Real editing tools around the models",
      "Fast iteration for storyboards and ads",
      "Strong creative community",
    ],
    cons: [
      "Credits are expensive at production volume",
      "Clips are still short for long-form",
      "Learning curve on camera/motion controls",
    ],
    pricingTiers: [
      {
        name: "Free",
        price: "$0",
        features: ["One-time credits", "Watermarks on some outputs", "Limited tools"],
      },
      {
        name: "Standard",
        price: "$15",
        period: "/mo",
        highlighted: true,
        features: ["625 credits", "No watermarks", "More model access"],
      },
      {
        name: "Pro",
        price: "$35",
        period: "/mo",
        features: ["2,250 credits", "Custom voices/assets", "Priority"],
      },
    ],
    faqs: [
      {
        question: "How long can Runway videos be?",
        answer:
          "Generative clips are typically a few seconds per job, extendable with extra generations. It is not a replacement for full-length editors yet.",
      },
      {
        question: "Is Runway good for ads?",
        answer:
          "Yes for concepting and social-length spots. For broadcast-length work you will still composite in Premiere, Resolve, or After Effects.",
      },
      {
        question: "Does Runway have a free plan?",
        answer:
          "A limited free plan exists with a small credit pool. Serious testing needs Standard or Pro.",
      },
    ],
    seoTitle: "Runway Review 2026: AI Video Quality, Credits & Pricing",
    metaDescription:
      "Runway ML review of Gen video models, credit costs, editing tools, and who should choose Synthesia instead.",
    conversionNote: "Pro plan converts from agency landing traffic.",
    couponCode: "RUNWAY10",
    couponDiscount: "10% extra credits",
    couponExpires: "Nov 12, 2026",
  },
  {
    slug: "synthesia",
    name: "Synthesia",
    website: "https://www.synthesia.io",
    affiliateUrl: "https://www.synthesia.io/?ref=forge",
    shortPitch: "AI avatar videos for training, L&D, and multilingual product explainers.",
    overview:
      "Synthesia is not trying to be a film camera — it is a studio for talking-head videos without a crew. Pick an avatar, paste a script, generate in 140+ languages, and ship training modules or product explainers. Quality is competent and corporate, which is exactly the point. Creative filmmakers will bounce; L&D teams will save weeks.",
    category: "video-animation",
    pricingModel: "Paid",
    rating: 4.5,
    reviewCount: 1188,
    featured: false,
    brandColor: "#2046E5",
    founded: "2017",
    bestFor: "L&D, internal comms, and multilingual explainer videos",
    features: [
      "140+ languages and voices",
      "Stock and custom avatars",
      "Screen recording + avatar",
      "Brand kit and templates",
      "Collaboration and reviews",
      "API for automated video",
    ],
    pros: [
      "Fastest path from script to presenter video",
      "Excellent language coverage",
      "Enterprise-ready brand controls",
      "Personal avatars look increasingly natural",
    ],
    cons: [
      "Not a creative filmmaking tool",
      "Starter minute caps are tight",
      "Avatars still feel slightly synthetic in close-ups",
    ],
    pricingTiers: [
      {
        name: "Starter",
        price: "$29",
        period: "/mo",
        features: ["10 minutes/mo", "9 avatars", "140+ languages"],
      },
      {
        name: "Creator",
        price: "$89",
        period: "/mo",
        highlighted: true,
        features: ["30 minutes", "Personal avatar", "Brand kit"],
      },
      {
        name: "Enterprise",
        price: "Custom",
        features: ["SSO", "API", "Custom avatars", "Security reviews"],
      },
    ],
    faqs: [
      {
        question: "Can I clone my own avatar?",
        answer:
          "Yes on Creator and above, typically from a guided recording session. Turnaround is days, not minutes.",
      },
      {
        question: "Synthesia vs Runway?",
        answer:
          "Synthesia is for presenter/training videos. Runway is for generative B-roll and cinematic clips. Most teams do not replace one with the other.",
      },
      {
        question: "Is there a free trial?",
        answer:
          "Synthesia offers a limited demo workspace. Expect to pay once you need exportable minutes.",
      },
    ],
    seoTitle: "Synthesia Review 2026: AI Avatars, Pricing & Use Cases",
    metaDescription:
      "Synthesia review of AI avatar videos for training and explainers, including languages, pricing, and Runway comparison.",
    conversionNote: "Creator plan wins from L&D comparison traffic.",
    couponCode: "SYNTH25",
    couponDiscount: "25% off first year Creator",
    couponExpires: "Dec 1, 2026",
  },
  {
    slug: "github-copilot",
    name: "GitHub Copilot",
    website: "https://github.com/features/copilot",
    affiliateUrl: "https://github.com/features/copilot?ref=forge",
    shortPitch: "The default AI pair programmer across VS Code, JetBrains, and GitHub.",
    overview:
      "GitHub Copilot is the most widely deployed coding assistant because it sits where developers already work: the editor, PRs, and the CLI. Completions are fast, Chat and agent modes cover multi-file edits, and business plans add IP indemnity that procurement teams care about. It is not the deepest agentic coder anymore, but it is the safest default for most companies.",
    category: "coding-dev",
    pricingModel: "Paid",
    rating: 4.6,
    reviewCount: 4201,
    featured: false,
    brandColor: "#2F81F7",
    founded: "2021",
    bestFor: "Teams standardized on GitHub who want inline completions plus chat",
    features: [
      "Inline completions in major IDEs",
      "Copilot Chat and Edits",
      "PR summaries and CLI",
      "Enterprise policy and indemnity",
      "Multi-model routing",
      "Workspace agents",
    ],
    pros: [
      "Ubiquitous IDE support",
      "Business-friendly procurement story",
      "Strong everyday autocomplete",
      "Tight GitHub PR integration",
    ],
    cons: [
      "Agentic multi-file refactors trail Cursor",
      "Chat quality varies by model routing",
      "No meaningful free plan for individuals",
    ],
    pricingTiers: [
      {
        name: "Pro",
        price: "$10",
        period: "/mo",
        highlighted: true,
        features: ["Completions", "Chat", "CLI", "Limited premium requests"],
      },
      {
        name: "Business",
        price: "$19",
        period: "/user/mo",
        features: ["Org policy", "SSO", "IP indemnity"],
      },
      {
        name: "Enterprise",
        price: "$39",
        period: "/user/mo",
        features: ["Fine-tuning options", "Advanced audit", "Premium models"],
      },
    ],
    faqs: [
      {
        question: "Is Copilot free for students?",
        answer:
          "Eligible students and maintainers of popular open source can still get Copilot at no cost through GitHub's programs.",
      },
      {
        question: "Copilot vs Cursor?",
        answer:
          "Copilot is the safer org-wide install. Cursor is more aggressive as an AI-native IDE for people living in the agent loop.",
      },
      {
        question: "Does Copilot train on my code?",
        answer:
          "Business and Enterprise plans exclude your snippets from training. Check current GitHub docs for your plan.",
      },
    ],
    seoTitle: "GitHub Copilot Review 2026: Features, Pricing & vs Cursor",
    metaDescription:
      "GitHub Copilot review covering completions, chat, business plans, and how it compares with Cursor for daily coding.",
    conversionNote: "Business seats convert from engineering-lead traffic.",
  },
  {
    slug: "cursor",
    name: "Cursor",
    website: "https://www.cursor.com",
    affiliateUrl: "https://www.cursor.com/?ref=forge",
    shortPitch: "AI-native IDE that plans, edits, and reviews across your whole codebase.",
    overview:
      "Cursor forked VS Code and rebuilt the editor around agents. Tab completions, Cmd-K inline edits, and a multi-file agent that can read the repo, apply diffs, and run terminal commands make it feel like a junior teammate rather than an autocomplete plugin. It is the tool many power users switched to in 2025–2026, with the tradeoff of a new editor to standardize.",
    category: "coding-dev",
    pricingModel: "Freemium",
    rating: 4.8,
    reviewCount: 2677,
    featured: true,
    brandColor: "#A78BFA",
    founded: "2023",
    bestFor: "Engineers who want an agent that can edit the whole repo",
    features: [
      "VS Code compatible IDE",
      "Repo-aware agent and chat",
      "Inline edits and Tab",
      "Rules and memories",
      "Terminal and browser tools",
      "Privacy / ignore controls",
    ],
    pros: [
      "Best-in-class multi-file agent workflow",
      "Familiar VS Code extensions and keybindings",
      "Fast Tab prediction",
      "Excellent for greenfield and refactors",
    ],
    cons: [
      "Requires switching editors from JetBrains/Vim purists",
      "Usage limits on Pro can surprise heavy agents",
      "Team admin features still maturing vs GitHub",
    ],
    pricingTiers: [
      {
        name: "Hobby",
        price: "$0",
        features: ["Limited agent uses", "Basic completions", "2-week Pro trial"],
      },
      {
        name: "Pro",
        price: "$20",
        period: "/mo",
        highlighted: true,
        features: ["Generous agent usage", "Frontier models", "Unlimited Tab*"],
      },
      {
        name: "Business",
        price: "$40",
        period: "/user/mo",
        features: ["SSO", "Privacy mode org-wide", "Admin dashboard"],
      },
    ],
    faqs: [
      {
        question: "Can I use my VS Code extensions?",
        answer:
          "Most Open VSX / VS Code extensions work. A few Microsoft-marketplace-only extensions do not.",
      },
      {
        question: "Is Cursor safe for private repos?",
        answer:
          "Privacy mode and .cursorignore exist. Enterprises should still review the current data-retention docs.",
      },
      {
        question: "Does Cursor replace Copilot?",
        answer:
          "For many individuals, yes. For companies already standardized on GitHub Copilot Business, it is an and/or decision by team.",
      },
    ],
    seoTitle: "Cursor Review 2026: AI IDE Features, Pricing & vs Copilot",
    metaDescription:
      "Cursor IDE review of agent coding, pricing, privacy, and whether it should replace GitHub Copilot on your team.",
    conversionNote: "Highest EPC of all coding tools this month.",
    couponCode: "CURSORPRO",
    couponDiscount: "1 month Pro extra on annual",
    couponExpires: "Nov 20, 2026",
  },
  {
    slug: "surfer-seo",
    name: "Surfer SEO",
    website: "https://surferseo.com",
    affiliateUrl: "https://surferseo.com/?ref=forge",
    shortPitch: "Content editor that scores drafts against ranking pages and AI outlines.",
    overview:
      "Surfer SEO sits between keyword research and the published article. Content Editor scores your draft against SERP competitors, Suggests terms, and pairs with AI writing so SEO teams can ship without a separate brief doc. It is not a full rank tracker, but for on-page content ops it remains one of the most cited tools in affiliate and SaaS blogs.",
    category: "marketing-sales",
    pricingModel: "Paid",
    rating: 4.4,
    reviewCount: 842,
    featured: false,
    brandColor: "#22C55E",
    founded: "2017",
    bestFor: "SEO teams and affiliate sites optimizing on-page content",
    features: [
      "Content Editor with real-time score",
      "AI outline and draft",
      "SERP analyzer",
      "Keyword research",
      "Content audit",
      "NLP term suggestions",
    ],
    pros: [
      "Clear, actionable on-page scoring",
      "Saves hours of SERP manual research",
      "AI writing is usable with editor scoring",
      "Integrates with Google Docs and WordPress",
    ],
    cons: [
      "Easy to over-optimize for the score",
      "Not a replacement for Ahrefs/SEMrush",
      "Credits can feel stingy on lower plans",
    ],
    pricingTiers: [
      {
        name: "Essential",
        price: "$79",
        period: "/mo",
        features: ["30 articles", "Content Editor", "AI writing"],
      },
      {
        name: "Scale",
        price: "$175",
        period: "/mo",
        highlighted: true,
        features: ["100 articles", "Audit", "AI tracker"],
      },
      {
        name: "Enterprise",
        price: "Custom",
        features: ["API", "SSO", "Higher limits"],
      },
    ],
    faqs: [
      {
        question: "Does Surfer guarantee rankings?",
        answer:
          "No tool can. Surfer improves on-page completeness versus current SERPs; links, brand, and uniqueness still matter.",
      },
      {
        question: "Can I write in Google Docs?",
        answer:
          "Yes, via the Surfer extension so your score updates as you draft.",
      },
      {
        question: "Is there a free plan?",
        answer:
          "No ongoing free plan. Trials appear during promotions.",
      },
    ],
    seoTitle: "Surfer SEO Review 2026: Content Editor, Pricing & ROI",
    metaDescription:
      "Surfer SEO review of Content Editor, AI writing, plans, and whether it is worth it versus Clearscope or Frase.",
    conversionNote: "Scale plan converts from affiliate-site reviews.",
    couponCode: "SURFER20",
    couponDiscount: "20% off annual",
    couponExpires: "Dec 31, 2026",
  },
  {
    slug: "adcreative-ai",
    name: "AdCreative.ai",
    website: "https://www.adcreative.ai",
    affiliateUrl: "https://www.adcreative.ai/?ref=forge",
    shortPitch: "Generates ad creatives, copy variants, and predictions for paid social teams.",
    overview:
      "AdCreative.ai is built for performance marketers who need 50 variations of a Meta or Google ad before Friday. Upload brand assets, generate creatives plus copy, and use the scoring model as a prior — not gospel. It will not replace a senior designer for brand films, but it compresses the testing treadmill that paid social demands.",
    category: "marketing-sales",
    pricingModel: "Freemium",
    rating: 4.3,
    reviewCount: 701,
    featured: false,
    brandColor: "#F43F5E",
    founded: "2021",
    bestFor: "Paid social teams testing creative volume",
    features: [
      "Ad creative generation at scale",
      "Copy variants for Meta/Google",
      "Creative scoring",
      "Brand kit",
      "Product photoshoots",
      "Competitor insights",
    ],
    pros: [
      "Huge creative volume in minutes",
      "Decent on-brand adherence with a kit",
      "Scoring helps prioritize tests",
      "Saves designer cycles on iteration",
    ],
    cons: [
      "Designs can look templated",
      "Scoring is a heuristic, not a crystal ball",
      "Overkill for brands running 5 ads a month",
    ],
    pricingTiers: [
      {
        name: "Starter",
        price: "$39",
        period: "/mo",
        features: ["10 credits", "Limited downloads", "Basic scoring"],
      },
      {
        name: "Professional",
        price: "$249",
        period: "/mo",
        highlighted: true,
        features: ["60 credits", "Full downloads", "Insights"],
      },
      {
        name: "Ultimate",
        price: "$749",
        period: "/mo",
        features: ["Unlimited-ish credits", "Team seats", "Priority"],
      },
    ],
    faqs: [
      {
        question: "Will AdCreative.ai replace my designer?",
        answer:
          "No. Use it for volume testing. Keep humans on hero campaigns and brand systems.",
      },
      {
        question: "Does it connect to Meta Ads?",
        answer:
          "You can export assets into Ads Manager; native publishing support varies by plan and integration updates.",
      },
      {
        question: "Is there a free trial?",
        answer:
          "Limited trials and demo credits appear often. Expect paid usage for real campaigns.",
      },
    ],
    seoTitle: "AdCreative.ai Review 2026: Ad Volume, Scoring & Pricing",
    metaDescription:
      "AdCreative.ai review for performance marketers: creative generation, scoring, pricing, and who should skip it.",
    conversionNote: "Professional plan converts after credit-limit hits.",
  },
  {
    slug: "elevenlabs",
    name: "ElevenLabs",
    website: "https://elevenlabs.io",
    affiliateUrl: "https://elevenlabs.io/?ref=forge",
    shortPitch: "The leading AI voice platform for cloning, narration, and conversational agents.",
    overview:
      "ElevenLabs set the quality bar for AI speech. Voice cloning, multilingual v3 models, and low-latency conversational agents make it the default for audiobooks, localization, game NPCs, and support bots. The product surface has expanded from a TTS box into a full audio platform, which is powerful and occasionally overwhelming.",
    category: "audio-voice",
    pricingModel: "Freemium",
    rating: 4.8,
    reviewCount: 2330,
    featured: true,
    brandColor: "#F4C150",
    founded: "2022",
    bestFor: "Narration, localization, and production-grade voice agents",
    features: [
      "Studio-quality TTS",
      "Instant and professional voice clones",
      "Dubbing studio",
      "Conversational AI agents",
      "Sound effects",
      "API with low latency",
    ],
    pros: [
      "Best overall voice naturalness",
      "Excellent multilingual cloning",
      "Serious API for production",
      "Dubbing workflow is a time saver",
    ],
    cons: [
      "Character quotas go fast on Pro work",
      "Dashboard sprawl as products expand",
      "Clone ethics/compliance still on you",
    ],
    pricingTiers: [
      {
        name: "Free",
        price: "$0",
        features: ["10k credits/mo", "Limited commercial use", "Watermarks on some"],
      },
      {
        name: "Creator",
        price: "$22",
        period: "/mo",
        highlighted: true,
        features: ["100k credits", "Instant clones", "Commercial license"],
      },
      {
        name: "Pro",
        price: "$99",
        period: "/mo",
        features: ["500k credits", "Professional cloning", "Higher concurrency"],
      },
    ],
    faqs: [
      {
        question: "Can I clone a voice legally?",
        answer:
          "Only with consent and in line with ElevenLabs' terms and local law. Do not clone public figures without rights.",
      },
      {
        question: "Is the free plan usable?",
        answer:
          "For demos, yes. For published audio, you will want Creator for credits and commercial terms.",
      },
      {
        question: "ElevenLabs vs Descript?",
        answer:
          "ElevenLabs is the voice engine. Descript is an editor that can use AI voices inside a transcript-based video/podcast workflow.",
      },
    ],
    seoTitle: "ElevenLabs Review 2026: Voice Cloning, Pricing & API",
    metaDescription:
      "ElevenLabs review of TTS quality, cloning, dubbing, conversational AI, pricing, and how it compares to Descript.",
    conversionNote: "Creator plan is the volume convert; Pro from studios.",
    couponCode: "VOICE30",
    couponDiscount: "30% off first month Creator",
    couponExpires: "Nov 8, 2026",
  },
  {
    slug: "descript",
    name: "Descript",
    website: "https://www.descript.com",
    affiliateUrl: "https://www.descript.com/?ref=forge",
    shortPitch: "Edit podcasts and videos by editing text, with Overdub and AI studio tools.",
    overview:
      "Descript turned transcription into a timeline. Delete a sentence in the script and it disappears from the video. Overdub, eye contact, studio sound, and screen recording make it the favorite of podcast teams and course creators who do not want to live in Premiere. It is an editor first that happens to include AI voices — not a voice API.",
    category: "audio-voice",
    pricingModel: "Freemium",
    rating: 4.6,
    reviewCount: 1644,
    featured: false,
    brandColor: "#5B4BFF",
    founded: "2017",
    bestFor: "Podcasters, course creators, and teams editing from transcripts",
    features: [
      "Text-based video and audio editing",
      "Overdub voice cloning",
      "Studio Sound enhancement",
      "Screen recording",
      "Eye contact and avatars",
      "Collaboration and publishing",
    ],
    pros: [
      "Fastest edit loop for talking-head content",
      "Studio Sound is legitimately good",
      "Collaboration feels like Google Docs for video",
      "Enough AI extras without leaving the editor",
    ],
    cons: [
      "Transcription errors still need a pass",
      "Transcription hours cap on cheaper plans",
      "Not a replacement for complex multi-cam finishing",
    ],
    pricingTiers: [
      {
        name: "Free",
        price: "$0",
        features: ["1 hour transcription", "Watermark on some exports", "Basic editing"],
      },
      {
        name: "Hobbyist",
        price: "$24",
        period: "/mo",
        highlighted: true,
        features: ["10 hours", "Overdub", "Studio Sound"],
      },
      {
        name: "Creator",
        price: "$36",
        period: "/mo",
        features: ["30 hours", "4K export", "More seats options"],
      },
    ],
    faqs: [
      {
        question: "Is Descript only for podcasts?",
        answer:
          "No. Course videos, product demos, and YouTube talking heads are common. It shines whenever the edit is dialogue-driven.",
      },
      {
        question: "How good is Overdub?",
        answer:
          "Good enough for small pickup lines after a solid clone. Not a full ElevenLabs replacement for character performances.",
      },
      {
        question: "Does the free plan watermark everything?",
        answer:
          "Some AI-enhanced exports are limited. Core cuts are usable for testing the text-based workflow.",
      },
    ],
    seoTitle: "Descript Review 2026: Text-Based Editing, Overdub & Pricing",
    metaDescription:
      "Descript review of transcript editing, Studio Sound, Overdub, plans, and when to use ElevenLabs instead.",
    conversionNote: "Hobbyist converts from podcast-niche posts.",
    couponCode: "DESCRIPTEDIT",
    couponDiscount: "20% off annual Creator",
    couponExpires: "Dec 10, 2026",
  },
];

export function getToolBySlug(slug: string) {
  return tools.find((tool) => tool.slug === slug);
}

export function getFeaturedTools() {
  return tools.filter((tool) => tool.featured);
}

export function getToolsByCategory(category: Category) {
  return tools.filter((tool) => tool.category === category);
}

export function getRelatedTools(tool: Tool, limit = 3) {
  return tools
    .filter((item) => item.slug !== tool.slug && item.category === tool.category)
    .slice(0, limit);
}

export function getDealTools() {
  return tools.filter((tool) => tool.couponCode);
}

export function searchTools(query: string, category?: Category | "All") {
  const q = query.trim().toLowerCase();
  return tools.filter((tool) => {
    const matchesCategory =
      !category || category === "All" || tool.category === category;
    const matchesQuery =
      !q ||
      tool.name.toLowerCase().includes(q) ||
      tool.shortPitch.toLowerCase().includes(q) ||
      tool.category.toLowerCase().includes(q) ||
      tool.bestFor.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });
}

import type { Comparison } from "@/lib/types";

export const comparisons: Array<
  Omit<Comparison, "status" | "createdAt" | "seoTitle" | "metaDescription" | "affiliateUrl">
> = [
  {
    slug: "jasper-ai-vs-copy-ai",
    toolASlug: "jasper-ai",
    toolBSlug: "copy-ai",
    tagline: "Brand-safe marketing suite versus GTM workflows on a budget.",
    overallWinner: "a",
    verdict:
      "Pick Jasper if you have a defined brand and a content team that ships campaigns every week. Pick Copy.ai if you are a startup that wants a free tier and repeatable GTM workflows without enterprise pricing.",
    rows: [
      { feature: "Best for", a: "Brand marketing teams", b: "Startup GTM teams", winner: "tie" },
      { feature: "Brand voice", a: "Excellent, first-class", b: "Good with Infobase", winner: "a" },
      { feature: "Free plan", a: "Trial only", b: "Usable free tier", winner: "b" },
      { feature: "Long-form quality", a: "Stronger out of the box", b: "Needs more setup", winner: "a" },
      { feature: "Workflow automation", a: "Campaign canvas", b: "Deep GTM workflows", winner: "b" },
      { feature: "Starting price", a: "$39/mo", b: "$0–$49/mo", winner: "b" },
      { feature: "Collaboration", a: "Team approvals & seats", b: "Workspaces, lighter admin", winner: "a" },
      { feature: "SEO tooling", a: "SEO mode built in", b: "Light / manual", winner: "a" },
    ],
  },
  {
    slug: "github-copilot-vs-cursor",
    toolASlug: "github-copilot",
    toolBSlug: "cursor",
    tagline: "The safe company default versus the AI-native IDE.",
    overallWinner: "b",
    verdict:
      "Cursor wins for individuals and product-minded teams who live in the agent loop. GitHub Copilot still wins procurement, JetBrains users, and orgs that want GitHub-native policy with less editor churn.",
    rows: [
      { feature: "Best for", a: "GitHub-standardized orgs", b: "Agent-first engineers", winner: "tie" },
      { feature: "Inline completions", a: "Excellent, everywhere", b: "Excellent Tab model", winner: "tie" },
      { feature: "Multi-file agents", a: "Improving, secondary", b: "Core product loop", winner: "b" },
      { feature: "IDE choice", a: "VS Code, JetBrains, Neovim", b: "Cursor (VS Code fork)", winner: "a" },
      { feature: "Enterprise controls", a: "Mature GitHub admin", b: "Business plan, newer", winner: "a" },
      { feature: "Starting price", a: "$10/mo", b: "$0–$20/mo", winner: "b" },
      { feature: "Repo awareness", a: "Good with workspace", b: "Excellent native context", winner: "b" },
      { feature: "Switching cost", a: "Plugin only", b: "New editor", winner: "a" },
    ],
  },
  {
    slug: "midjourney-vs-leonardo-ai",
    toolASlug: "midjourney",
    toolBSlug: "leonardo-ai",
    tagline: "Peak aesthetics versus production control and a free daily quota.",
    overallWinner: "a",
    verdict:
      "Midjourney still wins on look. Leonardo wins if you need a free plan, canvas edits, or custom models for game-ready assets. Many art teams keep both.",
    rows: [
      { feature: "Aesthetic quality", a: "Best in class", b: "Very good", winner: "a" },
      { feature: "Free plan", a: "No", b: "Daily tokens", winner: "b" },
      { feature: "Canvas / editing", a: "Limited", b: "Realtime canvas", winner: "b" },
      { feature: "Custom models", a: "Style refs, not full train", b: "First-class training", winner: "b" },
      { feature: "Prompt fidelity", a: "Strong on v6+", b: "Strong with controls", winner: "tie" },
      { feature: "Starting price", a: "$10/mo", b: "$0", winner: "b" },
      { feature: "Commercial clarity", a: "Paid plans", b: "Plan-dependent", winner: "a" },
      { feature: "Community / styles", a: "Huge shared vocabulary", b: "Growing model hub", winner: "a" },
    ],
  },
  {
    slug: "runway-vs-synthesia",
    toolASlug: "runway",
    toolBSlug: "synthesia",
    tagline: "Generative cinema versus avatar explainers for L&D.",
    overallWinner: "tie",
    verdict:
      "These products barely compete. Runway is for generative B-roll and campaign films. Synthesia is for presenter videos without a crew. Choose based on whether you need a scene or a speaker.",
    rows: [
      { feature: "Primary output", a: "Cinematic generative clips", b: "Avatar talking-head", winner: "tie" },
      { feature: "Best team", a: "Creative / agency", b: "L&D / enablement", winner: "tie" },
      { feature: "Languages", a: "Prompt-dependent", b: "140+ built in", winner: "b" },
      { feature: "Edit suite", a: "AI video editor", b: "Template studio", winner: "a" },
      { feature: "Starting price", a: "$0–$15", b: "$29", winner: "a" },
      { feature: "Custom presenter", a: "Not the point", b: "Personal avatars", winner: "b" },
      { feature: "Clip length", a: "Short generations", b: "Script-length minutes", winner: "b" },
      { feature: "Look & feel", a: "Film / social ads", b: "Corporate polish", winner: "a" },
    ],
  },
  {
    slug: "elevenlabs-vs-descript",
    toolASlug: "elevenlabs",
    toolBSlug: "descript",
    tagline: "Production voice engine versus transcript-first editor.",
    overallWinner: "a",
    verdict:
      "Use ElevenLabs when the voice is the product. Use Descript when the edit is the product. Podcast teams often generate in ElevenLabs and finish in Descript — or stay in Descript if Overdub is enough.",
    rows: [
      { feature: "Voice quality", a: "Industry leading", b: "Good Overdub", winner: "a" },
      { feature: "Editing workflow", a: "Generator / API", b: "Text-based timeline", winner: "b" },
      { feature: "Podcast finishing", a: "Export elsewhere", b: "Built for it", winner: "b" },
      { feature: "Voice cloning", a: "Best-in-class", b: "Overdub pickups", winner: "a" },
      { feature: "API / agents", a: "First-class", b: "Limited", winner: "a" },
      { feature: "Starting price", a: "$0", b: "$0", winner: "tie" },
      { feature: "Dubbing", a: "Dedicated studio", b: "Not the focus", winner: "a" },
      { feature: "Collaboration", a: "Workspace + API", b: "Docs-like video collab", winner: "b" },
    ],
  },
];


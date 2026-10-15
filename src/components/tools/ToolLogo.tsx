import {
  AudioLines,
  BarChart3,
  Bot,
  Briefcase,
  Clapperboard,
  Code2,
  Cpu,
  Globe,
  GraduationCap,
  Headphones,
  ImageIcon,
  Landmark,
  LayoutGrid,
  Megaphone,
  PenLine,
  Share2,
  Shield,
  ShoppingBag,
  Sparkles,
  Users,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const icons: Record<string, LucideIcon> = {
  "writing-seo": PenLine,
  Writing: PenLine,
  "image-design": ImageIcon,
  Image: ImageIcon,
  "video-animation": Clapperboard,
  Video: Clapperboard,
  "audio-voice": AudioLines,
  Audio: AudioLines,
  "coding-dev": Code2,
  Coding: Code2,
  "marketing-sales": Megaphone,
  Marketing: Megaphone,
  "chatbots-assistants": Bot,
  "productivity-workspace": LayoutGrid,
  "automation-ai-agents": Workflow,
  "business-crm": Briefcase,
  ecommerce: ShoppingBag,
  "website-builders-hosting": Globe,
  "cybersecurity-vpn": Shield,
  "data-analytics": BarChart3,
  "finance-accounting": Landmark,
  "education-research": GraduationCap,
  "customer-support": Headphones,
  "social-media": Share2,
  "hr-recruiting": Users,
  "gadgets-hardware": Cpu,
};

export function ToolLogo({
  name,
  category,
  color,
  size = "md",
}: {
  name: string;
  category: string;
  color: string;
  size?: "sm" | "md" | "lg";
}) {
  const Icon = icons[category] || Sparkles;
  const box =
    size === "lg" ? "h-16 w-16" : size === "sm" ? "h-10 w-10" : "h-12 w-12";
  const icon = size === "lg" ? "h-7 w-7" : size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <span
      className={`relative inline-flex ${box} shrink-0 items-center justify-center overflow-hidden rounded-2xl text-white`}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      <span className="absolute inset-0 opacity-25 mix-blend-overlay bg-[radial-gradient(circle_at_20%_20%,white,transparent_45%)]" />
      <Icon className={icon} />
      <span className="sr-only">{name} logo</span>
    </span>
  );
}

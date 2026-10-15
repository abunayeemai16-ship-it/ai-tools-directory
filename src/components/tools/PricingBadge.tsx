import type { PricingModel } from "@/lib/types";
import { cn } from "@/lib/utils";

const styles: Record<PricingModel, string> = {
  Free: "bg-mint/15 text-mint",
  Freemium: "bg-blue/15 text-blue",
  Paid: "bg-accent/15 text-accent",
};

export function PricingBadge({ model }: { model: PricingModel }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium",
        styles[model],
      )}
    >
      {model}
    </span>
  );
}

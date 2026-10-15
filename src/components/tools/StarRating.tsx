import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => {
        const filled = rating >= index + 0.75;
        const half = !filled && rating >= index + 0.25;
        return (
          <Star
            key={index}
            className={cn(
              dim,
              filled || half ? "fill-accent text-accent" : "text-line",
              half ? "opacity-70" : "",
            )}
          />
        );
      })}
    </span>
  );
}

import type { PricingModel, PublishStatus, Tool } from "@/lib/types";

export type CatalogEntry = {
  name: string;
  slug?: string;
  website: string;
  category: string;
  pricingModel: PricingModel;
  founded: string;
  featured?: boolean;
  brandColor?: string;
  shortPitch: string;
  bestFor: string;
  job: string;
  skipIf: string;
  features: string[];
  starter?: string;
  pro?: string;
  enterprise?: string;
  core?: boolean;
};

/** Lean row used by the scaler library. */
export type CatalogLean = [
  name: string,
  website: string,
  category: string,
  pricingModel: PricingModel,
  founded: string,
  shortPitch: string,
];

export type HydrateOptions = {
  status?: PublishStatus;
};

export type CatalogProgress = {
  librarySize: number;
  inDatabase: number;
  remaining: number;
  published: number;
  drafts: number;
  cap: number;
};

export type ScaledToolSummary = Pick<
  Tool,
  "slug" | "name" | "category" | "status" | "officialUrl" | "pricingModel"
>;

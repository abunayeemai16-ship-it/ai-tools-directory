import type { Metadata } from "next";
import { SubmitForm } from "@/components/submit/SubmitForm";
import { listCategories } from "@/lib/db";
import { live } from "@/lib/live";

export const instant = false;

export const metadata: Metadata = {
  title: "Submit an AI Tool",
  description:
    "Founders can submit an AI product for a free listing or a $49 featured placement on Forge.",
};

export default async function SubmitPage() {
  await live();
  const categories = await listCategories();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs uppercase tracking-[0.18em] text-accent">Founders</p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Submit a tool</h1>
      <p className="mt-3 text-muted">
        Free listings are reviewed editorially. Featured listings ($49) get a
        homepage badge, comparison priority, and a 30-day slot on Deals.
      </p>
      <div className="mt-8">
        <SubmitForm categories={categories} />
      </div>
    </div>
  );
}

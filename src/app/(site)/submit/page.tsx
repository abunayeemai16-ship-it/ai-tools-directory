import type { Metadata } from "next";
import Link from "next/link";
import { SubmitForm } from "@/components/submit/SubmitForm";
import { listCategories } from "@/lib/db";
import { live } from "@/lib/live";

export const instant = false;

export const metadata: Metadata = {
  title: "Submit an AI Tool",
  description:
    "Founders can submit an AI product for a free, editorially reviewed listing on Forge.",
};

export default async function SubmitPage() {
  await live();
  const categories = await listCategories();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs uppercase tracking-[0.18em] text-accent">Founders</p>
      <h1 className="mt-2 font-serif text-4xl sm:text-5xl">Submit a tool</h1>
      <p className="mt-3 text-muted">
        Free listings are reviewed editorially. For homepage visibility, see{" "}
        <Link href="/advertise" className="text-accent hover:underline">
          advertising options
        </Link>
        .
      </p>
      <div className="mt-8">
        <SubmitForm categories={categories} />
      </div>
    </div>
  );
}

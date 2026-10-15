import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="text-xs uppercase tracking-[0.18em] text-accent">404</p>
      <h1 className="mt-3 font-serif text-4xl">That page is not in the directory</h1>
      <p className="mt-3 text-muted">
        The tool or comparison may have moved. Head back to the catalog.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-ink"
      >
        Browse tools
      </Link>
    </div>
  );
}

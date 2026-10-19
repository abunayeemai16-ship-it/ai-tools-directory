"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { Search, Swords } from "lucide-react";
import { COMPARE_LIMITS, parseCompareNames, toolFinder } from "@/lib/compare";
import { cn } from "@/lib/utils";

type ToolOption = { name: string; slug: string };
type Pair = { slug: string; a: string; b: string };

const MAX_SUGGESTIONS = 8;

export function CompareSearch({
  tools,
  pairs,
  initialA = "",
  initialB = "",
}: {
  tools: ToolOption[];
  pairs: Pair[];
  initialA?: string;
  initialB?: string;
}) {
  const router = useRouter();
  const [a, setA] = useState(initialA);
  const [b, setB] = useState(initialB);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const findTool = useMemo(() => toolFinder(tools), [tools]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const names = parseCompareNames(a, b);
    if (typeof names === "string") {
      setError(names);
      return;
    }
    const toolA = findTool(names.a);
    const toolB = findTool(names.b);
    if (toolA && toolA === toolB) {
      setError("Pick two different tools.");
      return;
    }
    setError("");
    const pair =
      toolA && toolB
        ? pairs.find(
            (item) =>
              (item.a === toolA.slug && item.b === toolB.slug) ||
              (item.a === toolB.slug && item.b === toolA.slug),
          )
        : undefined;
    const params = new URLSearchParams({
      a: toolA?.slug ?? names.a,
      b: toolB?.slug ?? names.b,
    });
    startTransition(() => {
      router.push(pair ? `/compare/${pair.slug}` : `/compare/custom?${params}`);
    });
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-accent/30 bg-surface p-4 sm:p-5"
    >
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto] sm:items-end">
        <ToolInput label="Tool 1" value={a} onChange={setA} tools={tools} placeholder="e.g. ChatGPT" />
        <Swords className="mx-auto hidden h-5 w-5 text-accent sm:mb-3 sm:block" />
        <ToolInput label="Tool 2" value={b} onChange={setB} tools={tools} placeholder="e.g. Claude" />
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-accent px-6 text-sm font-semibold text-ink transition hover:bg-accent-2 disabled:opacity-60"
        >
          <Search className="h-4 w-4" />
          {pending ? "Comparing…" : "Compare"}
        </button>
      </div>
      {error ? <p className="mt-3 text-sm text-rose">{error}</p> : null}
      <p className="mt-3 text-xs text-muted">
        Pick from {tools.length.toLocaleString("en-US")} tools in the directory, or type any AI tool
        and we&apos;ll research the matchup live on the web.
      </p>
    </form>
  );
}

function ToolInput({
  label,
  value,
  onChange,
  tools,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  tools: ToolOption[];
  placeholder: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const matches = useMemo(() => {
    const query = value.trim().toLowerCase();
    if (!query) return [];
    const starts: ToolOption[] = [];
    const contains: ToolOption[] = [];
    for (const tool of tools) {
      const name = tool.name.toLowerCase();
      if (name.startsWith(query)) starts.push(tool);
      else if (contains.length < MAX_SUGGESTIONS && name.includes(query)) contains.push(tool);
      if (starts.length >= MAX_SUGGESTIONS) break;
    }
    const list = [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
    return list.length === 1 && list[0].name.toLowerCase() === query ? [] : list;
  }, [value, tools]);

  const showList = open && matches.length > 0;

  function choose(tool: ToolOption) {
    onChange(tool.name);
    setOpen(false);
    setActive(-1);
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-sm text-muted">
        {label}
      </label>
      <input
        id={id}
        role="combobox"
        aria-expanded={showList}
        aria-controls={`${id}-list`}
        aria-autocomplete="list"
        autoComplete="off"
        maxLength={COMPARE_LIMITS.nameMax}
        value={value}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(event) => {
          if (!showList) return;
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setActive((current) => (current + 1) % matches.length);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActive((current) => (current <= 0 ? matches.length - 1 : current - 1));
          } else if (event.key === "Enter" && active >= 0) {
            event.preventDefault();
            choose(matches[active]);
          } else if (event.key === "Escape") {
            setOpen(false);
          }
        }}
        className="h-11 w-full rounded-xl border border-line bg-ink px-3 text-sm outline-none focus:border-accent"
      />
      {showList ? (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-line bg-ink-2 py-1 shadow-xl"
        >
          {matches.map((tool, position) => (
            <li
              key={tool.slug}
              role="option"
              aria-selected={position === active}
              onMouseDown={(event) => {
                event.preventDefault();
                choose(tool);
              }}
              className={cn(
                "cursor-pointer px-3 py-2 text-sm",
                position === active ? "bg-surface text-white" : "text-muted hover:bg-surface hover:text-white",
              )}
            >
              {tool.name}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { BranchIcon, CheckIcon, ChevronRightIcon, FolderIcon, GlobeIcon, MinusIcon, NoteIcon, StarIcon, XIcon } from "@/components/icons";
import { easeOut, glide, press, rowPress, tap } from "@/lib/motion";
import { MAX_FILES, tokensOf, type PageResult, type RepoFile, type RepoListing } from "@/lib/sources";
import type { Artifact } from "@/lib/types";

// Bringing something in from outside the chat: a GitHub repository, or a web page. Nothing is added until you've
// seen what it is and how much of Snap's context it takes: the dialog lists the files, says what fits, and lets
// you tick folders in and out. What you add becomes documents in the chat, read by Snap on every turn.

export type SourceKind = "github" | "page";
/** What the dialog hands back: the documents, and where they came from. */
export type Incoming = { files: { name: string; text: string }[]; source: NonNullable<Artifact["source"]> };

const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k` : `${n}`);
const plural = (n: number, word: string) => `${n.toLocaleString("en")} ${word}${n === 1 ? "" : "s"}`;

const swap = {
  initial: { opacity: 0, filter: "blur(4px)" },
  animate: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.22, ease: easeOut } },
  exit: { opacity: 0, filter: "blur(4px)", transition: { duration: 0.1, ease: easeOut } },
};

export function SourceDialog({
  open,
  onClose,
  onAdd,
  freeTokens,
  freeFiles,
}: {
  /** Which tab to open on, or null when closed. */
  open: SourceKind | null;
  onClose: () => void;
  onAdd: (incoming: Incoming) => void;
  /** Room left in Snap's context, and in the number of files it can rank. */
  freeTokens: number;
  freeFiles: number;
}) {
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", key);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-[12vh]"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.2, ease: easeOut } }}
          exit={{ opacity: 0, transition: { duration: 0.14, ease: easeOut } }}
        >
          <Panel first={open} onClose={onClose} onAdd={onAdd} freeTokens={freeTokens} freeFiles={freeFiles} />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

const TABS: { id: SourceKind; label: string; icon: ReactNode }[] = [
  { id: "github", label: "GitHub", icon: <BranchIcon size={15} /> },
  { id: "page", label: "Web page", icon: <GlobeIcon size={15} /> },
];

function Panel({ first, onClose, onAdd, freeTokens, freeFiles }: { first: SourceKind; onClose: () => void; onAdd: (i: Incoming) => void; freeTokens: number; freeFiles: number }) {
  const [tab, setTab] = useState(first);
  const id = useId();
  const add = (incoming: Incoming) => {
    onAdd(incoming);
    onClose();
  };
  return (
    <motion.div
      role="dialog"
      aria-modal
      aria-label="Add to this chat"
      onClick={(e) => e.stopPropagation()}
      className="flex w-full max-w-[35rem] flex-col gap-2 rounded-[20px] bg-raised p-2 shadow-popover"
      initial={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.22, ease: easeOut } }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12, ease: easeOut } }}
    >
      <div className="flex items-center justify-between">
        <div className="flex gap-0.5" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`focus-ring relative flex h-8 items-center gap-1.5 rounded-[10px] ps-2.5 pe-3 text-[13px] transition-colors duration-200 ${tab === t.id ? "text-fg" : "text-fg-4 hover:text-fg-2"}`}
            >
              {/* the selected tab's fill slides from one to the other */}
              {tab === t.id && <motion.span layoutId={`${id}-tab`} transition={glide} className="absolute inset-0 rounded-[10px] bg-control shadow-[inset_0_0_0_1px_var(--line)]" />}
              <span className="relative flex items-center gap-1.5 font-medium">
                {t.icon}
                {t.label}
              </span>
            </button>
          ))}
        </div>
        <motion.button
          type="button"
          whileTap={press}
          onClick={onClose}
          aria-label="Close"
          className="focus-ring flex size-8 items-center justify-center rounded-[10px] text-fg-4 hover:bg-white/[0.06] hover:text-fg"
        >
          <XIcon size={16} />
        </motion.button>
      </div>
      {/* one height for every state, so the dialog doesn't jump as a lookup comes back */}
      <div className="flex min-h-[25rem] flex-col">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={tab} {...swap} className="flex flex-1 flex-col">
            {tab === "github" ? <RepoTab onAdd={add} freeTokens={freeTokens} freeFiles={freeFiles} /> : <PageTab onAdd={add} freeTokens={freeTokens} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ---------- shared pieces ---------- */

function Lookup({
  value,
  onValue,
  onSubmit,
  placeholder,
  label,
  action,
  busy,
  icon,
}: {
  value: string;
  onValue: (v: string) => void;
  onSubmit: () => void;
  placeholder: string;
  label: string;
  action: string;
  busy: boolean;
  icon: ReactNode;
}) {
  return (
    <form
      className="flex gap-1.5 px-1"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[12px] bg-surface ps-3 pe-2 text-fg-4 shadow-[inset_0_0_0_1px_var(--line)] transition-shadow duration-150 focus-within:shadow-[inset_0_0_0_1px_var(--line-strong)]">
        {icon}
        <span className="sr-only">{label}</span>
        <input
          autoFocus
          value={value}
          onChange={(e) => onValue(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-fg outline-none placeholder:text-fg-5 sm:text-[14px]"
        />
      </label>
      <motion.button
        type="submit"
        whileTap={value.trim() && !busy ? press : undefined}
        disabled={!value.trim() || busy}
        className="focus-ring flex h-10 shrink-0 items-center gap-2 rounded-[12px] bg-control px-3.5 text-[13px] font-medium text-fg transition-colors hover:bg-control-hover disabled:text-fg-5 disabled:hover:bg-control"
      >
        {busy && <Spinner />}
        {action}
      </motion.button>
    </form>
  );
}

const Spinner = () => <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent motion-reduce:animate-none" />;

/** A problem, said plainly: the red is only ever beside an icon and words. */
function Problem({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-2 px-2 text-[13px] leading-snug text-pretty text-fg-2" role="alert">
      <XIcon size={15} className="mt-px shrink-0 text-bad" />
      {children}
    </p>
  );
}

/** How much of Snap's context this would take, against what's free. */
function Budget({ tokens, free, note }: { tokens: number; free: number; note?: string }) {
  const over = tokens > free;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3 text-[12px] tabular-nums">
        <span className="text-fg-2">
          <span className="font-medium text-fg">{k(tokens)} tokens</span>, of the {k(Math.max(0, free))} still free in Snap&apos;s context
        </span>
        {note && <span className="shrink-0 text-fg-4">{note}</span>}
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className={`h-full origin-left rounded-full transition-[scale,background-color] duration-300 ease-out ${over ? "bg-bad" : "bg-accent"}`}
          style={{ scale: `${Math.min(1, free > 0 ? tokens / free : 1)} 1` }}
        />
      </div>
    </div>
  );
}

function Footer({ note, action, disabled, busy, onAction }: { note: ReactNode; action: string; disabled: boolean; busy: boolean; onAction: () => void }) {
  return (
    <div className="mt-auto flex items-center justify-between gap-3 px-2 pt-3 pb-1">
      <p className="text-[12px] leading-snug text-pretty text-fg-4">{note}</p>
      <motion.button
        type="button"
        whileTap={disabled ? undefined : press}
        disabled={disabled}
        onClick={onAction}
        className="focus-ring flex h-9 shrink-0 items-center gap-2 rounded-[12px] bg-accent px-3.5 text-[13px] font-medium text-accent-fg transition-colors duration-150 disabled:bg-control disabled:text-fg-5"
      >
        {busy && <Spinner />}
        <span className="tabular-nums">{action}</span>
      </motion.button>
    </div>
  );
}

/* ---------- a GitHub repository ---------- */

const EXAMPLES = ["pmndrs/zustand", "sindresorhus/ky", "honojs/hono"];
/** Folders that are rarely what a question is about: the first to go when a repository doesn't fit. */
const RARELY = ["test", "tests", "__tests__", "e2e", "fixtures", "__fixtures__", "examples", "example", "benchmarks", "benchmark", "bench", "docs", "doc", "website", "www", "site", ".github", "scripts", "playground", "demo", "demos"];

/** Everything readable, less whole folders until it fits: the rarely-asked-about first, then the heaviest. */
function fit(files: RepoFile[], base: string, maxTokens: number, maxFiles: number) {
  const picked = new Set(files.map((f) => f.path));
  const size = new Map(files.map((f) => [f.path, f.size]));
  const left: string[] = [];
  const top = (p: string) => {
    const rel = p.slice(base.length);
    const i = rel.indexOf("/");
    return i < 0 ? null : rel.slice(0, i);
  };
  const total = () => tokensOf([...picked].reduce((n, p) => n + size.get(p)!, 0));
  while (picked.size > maxFiles || total() > maxTokens) {
    const dirs = new Map<string, number>();
    for (const p of picked) {
      const d = top(p);
      if (d) dirs.set(d, (dirs.get(d) ?? 0) + size.get(p)!);
    }
    const drop = RARELY.find((d) => dirs.has(d)) ?? [...dirs].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!drop) {
      // only loose files left: the biggest go
      const biggest = [...picked].sort((a, b) => size.get(b)! - size.get(a)!)[0];
      if (!biggest) break;
      picked.delete(biggest);
      continue;
    }
    for (const p of [...picked]) if (top(p) === drop) picked.delete(p);
    left.push(drop);
  }
  return { picked, left };
}

type Row = { name: string; path: string; dir: boolean; count: number; picked: number; tokens: number };

function RepoTab({ onAdd, freeTokens, freeFiles }: { onAdd: (i: Incoming) => void; freeTokens: number; freeFiles: number }) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ready" | "adding">("idle");
  const [error, setError] = useState("");
  const [repo, setRepo] = useState<RepoListing | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [left, setLeft] = useState<string[]>([]);
  /** The folder being looked at, as a path ending in "/" ("" is the top). */
  const [at, setAt] = useState("");
  const [fetched, setFetched] = useState(0);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const maxFiles = Math.max(0, Math.min(MAX_FILES, freeFiles));
  const base = repo?.path ? `${repo.path}/` : "";

  const lookup = async (value = query) => {
    if (!value.trim()) return;
    abort.current?.abort();
    const controller = (abort.current = new AbortController());
    setState("loading");
    setError("");
    try {
      const res = await fetch("/api/github/repo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ repo: value }), signal: controller.signal });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't reach GitHub.");
      const listing = body as RepoListing;
      const start = fit(listing.files, listing.path ? `${listing.path}/` : "", freeTokens, maxFiles);
      setRepo(listing);
      setPicked(start.picked);
      setLeft(start.left);
      setAt(listing.path ? `${listing.path}/` : "");
      setState("ready");
    } catch (e) {
      if (controller.signal.aborted) return;
      setRepo(null);
      setError(e instanceof Error ? e.message : "Couldn't reach GitHub.");
      setState("idle");
    }
  };

  const sizes = useMemo(() => new Map((repo?.files ?? []).map((f) => [f.path, f.size])), [repo]);
  const tokens = useMemo(() => tokensOf([...picked].reduce((n, p) => n + (sizes.get(p) ?? 0), 0)), [picked, sizes]);

  // what's in the folder being looked at: its folders first, then its files
  const rows = useMemo(() => {
    const map = new Map<string, Row>();
    for (const f of repo?.files ?? []) {
      if (!f.path.startsWith(at)) continue;
      const rest = f.path.slice(at.length);
      const i = rest.indexOf("/");
      const name = i < 0 ? rest : rest.slice(0, i);
      const row = map.get(name) ?? { name, path: at + name + (i < 0 ? "" : "/"), dir: i >= 0, count: 0, picked: 0, tokens: 0 };
      row.count++;
      if (picked.has(f.path)) {
        row.picked++;
        row.tokens += f.size;
      }
      map.set(name, row);
    }
    return [...map.values()].sort((a, b) => Number(b.dir) - Number(a.dir) || a.name.localeCompare(b.name));
  }, [repo, at, picked]);

  const toggle = (row: Row) => {
    const next = new Set(picked);
    const under = (repo?.files ?? []).filter((f) => (row.dir ? f.path.startsWith(row.path) : f.path === row.path));
    if (row.picked === row.count) under.forEach((f) => next.delete(f.path));
    else under.forEach((f) => next.add(f.path));
    setPicked(next);
  };

  const add = async () => {
    if (!repo) return;
    const controller = (abort.current = new AbortController());
    const paths = (repo.files ?? []).map((f) => f.path).filter((p) => picked.has(p));
    setState("adding");
    setFetched(0);
    setError("");
    const files: { name: string; text: string }[] = [];
    try {
      for (let i = 0; i < paths.length; i += 40) {
        const res = await fetch("/api/github/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ owner: repo.owner, repo: repo.repo, ref: repo.ref, paths: paths.slice(i, i + 40) }),
          signal: controller.signal,
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Couldn't reach GitHub.");
        for (const f of body.files as { path: string; text: string }[]) files.push({ name: f.path, text: f.text });
        setFetched(Math.min(paths.length, i + 40));
      }
      if (!files.length) throw new Error("None of those files could be read.");
      onAdd({ files, source: { kind: "github", label: `${repo.owner}/${repo.repo}`, url: `https://github.com/${repo.owner}/${repo.repo}/tree/${repo.ref}${repo.path ? `/${repo.path}` : ""}` } });
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e instanceof Error ? e.message : "Couldn't reach GitHub.");
      setState("ready");
    }
  };

  const over = tokens > freeTokens;
  const tooMany = picked.size > maxFiles;
  const crumbs = at.slice(base.length).split("/").filter(Boolean);
  const adding = state === "adding";

  return (
    <div className="flex flex-1 flex-col gap-3">
      <Lookup
        value={query}
        onValue={setQuery}
        onSubmit={() => lookup()}
        placeholder="owner/repo, or a github.com link"
        label="Repository"
        action="Look up"
        busy={state === "loading"}
        icon={<BranchIcon size={16} className="shrink-0" />}
      />
      {error && <Problem>{error}</Problem>}

      <AnimatePresence mode="popLayout" initial={false}>
        {state === "loading" ? (
          <motion.div key="loading" {...swap} className="flex flex-col gap-2.5 px-2 pt-1" role="status" aria-label="Looking up the repository">
            <div className="skeleton h-4 w-2/5 rounded-[6px]" />
            <div className="skeleton h-3 w-3/4 rounded-[6px]" />
            <div className="skeleton mt-2 h-1 w-full rounded-full" />
            {[72, 58, 64, 46, 60].map((w, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <div className="skeleton size-[18px] rounded-[6px]" />
                <div className="skeleton h-3 rounded-[6px]" style={{ width: `${w}%` }} />
              </div>
            ))}
          </motion.div>
        ) : repo ? (
          <motion.div key={`${repo.owner}/${repo.repo}/${repo.ref}/${repo.path}`} {...swap} className="flex flex-1 flex-col gap-3">
            <div className="flex flex-col gap-1 px-2">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-fg-4 tabular-nums">
                <span className="text-[14px] font-medium text-fg">
                  {repo.owner}/{repo.repo}
                </span>
                <span className="flex items-center gap-1">
                  <StarIcon size={13} />
                  {k(repo.stars)}
                </span>
                <span className="flex items-center gap-1">
                  <BranchIcon size={13} />
                  {repo.ref}
                </span>
              </div>
              {repo.description && <p className="line-clamp-1 text-[13px] text-fg-3">{repo.description}</p>}
            </div>

            <div className="px-2">
              <Budget tokens={tokens} free={freeTokens} note={`${picked.size.toLocaleString("en")} of ${repo.files.length.toLocaleString("en")} files`} />
            </div>

            {over || tooMany ? (
              <Problem>
                {over ? `Over by ${k(tokens - freeTokens)} tokens.` : `Snap ranks up to ${maxFiles} files at once: ${picked.size - maxFiles} too many.`} Untick a folder to make room.
              </Problem>
            ) : left.length > 0 ? (
              <p className="px-2 text-[12px] leading-snug text-pretty text-fg-4">
                Left out so it fits: {left.slice(0, 5).join(", ")}
                {left.length > 5 ? ` and ${left.length - 5} more` : ""}. {left.length === 1 ? "Tick it back in if you need it." : "Tick them back in if you need them."}
              </p>
            ) : repo.truncated ? (
              <p className="px-2 text-[12px] leading-snug text-pretty text-fg-4">This repository is too big for GitHub to list whole. Paste a link to one of its folders to see all of that folder.</p>
            ) : null}

            <div className="flex min-h-0 flex-col rounded-[12px] bg-surface p-1 shadow-[inset_0_0_0_1px_var(--line)]">
              <nav className="no-scrollbar flex items-center gap-0.5 overflow-x-auto px-1 pt-0.5 pb-1 text-[12px]" aria-label="Folder">
                <Crumb label={base ? base.slice(0, -1) : `${repo.repo}`} current={!crumbs.length} onClick={() => setAt(base)} />
                {crumbs.map((c, i) => (
                  <span key={i} className="flex shrink-0 items-center gap-0.5">
                    <ChevronRightIcon size={12} className="text-fg-6" />
                    <Crumb label={c} current={i === crumbs.length - 1} onClick={() => setAt(`${base}${crumbs.slice(0, i + 1).join("/")}/`)} />
                  </span>
                ))}
              </nav>
              <ul className="flex max-h-[11.5rem] flex-col overflow-y-auto">
                {rows.map((row) => (
                  <li key={row.path} className="flex items-center">
                    <Check
                      state={row.picked === 0 ? "off" : row.picked === row.count ? "on" : "some"}
                      label={`${row.picked === row.count ? "Leave out" : "Include"} ${row.name}`}
                      onClick={() => toggle(row)}
                      disabled={adding}
                    />
                    {row.dir ? (
                      <button
                        type="button"
                        onClick={() => setAt(row.path)}
                        className={`focus-ring group flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[8px] ps-1.5 pe-1.5 text-start text-[13px] hover:bg-white/[0.05] ${rowPress}`}
                      >
                        <FolderIcon size={15} className="shrink-0 text-fg-4" />
                        <span className={`min-w-0 flex-1 truncate transition-colors duration-200 ${row.picked ? "text-fg" : "text-fg-4"}`}>{row.name}</span>
                        <span className="shrink-0 text-[12px] text-fg-4 tabular-nums">
                          {row.picked === row.count ? plural(row.count, "file") : `${row.picked} of ${row.count}`}
                          {row.picked > 0 && ` · ${k(tokensOf(row.tokens))}`}
                        </span>
                        <ChevronRightIcon size={14} className="shrink-0 text-fg-5 transition-colors group-hover:text-fg-2" />
                      </button>
                    ) : (
                      <div className="flex h-8 min-w-0 flex-1 items-center gap-2 ps-1.5 pe-2 text-[13px]">
                        <NoteIcon size={15} className="shrink-0 text-fg-5" />
                        <span className={`min-w-0 flex-1 truncate transition-colors duration-200 ${row.picked ? "text-fg-2" : "text-fg-5"}`}>{row.name}</span>
                        <span className="shrink-0 text-[12px] text-fg-5 tabular-nums">{k(tokensOf(sizes.get(row.path) ?? 0))}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <Footer
              note={
                adding ? (
                  <span className="tabular-nums">
                    Fetched {fetched} of {picked.size} files
                  </span>
                ) : (
                  "Snap reads all of it on every turn and picks the files each answer needs."
                )
              }
              action={adding ? "Adding" : `Add ${plural(picked.size, "file")}`}
              disabled={adding || over || tooMany || picked.size === 0}
              busy={adding}
              onAction={add}
            />
          </motion.div>
        ) : (
          <motion.div key="idle" {...swap} className="flex flex-1 flex-col gap-3 px-2 pt-1">
            <p className="text-[13px] leading-relaxed text-pretty text-fg-3">
              Paste a public repository and its code joins this chat as documents. You&apos;ll see how much fits before anything is added.
            </p>
            <div className="flex flex-wrap items-center gap-1.5 text-[12px] text-fg-4">
              Try
              {EXAMPLES.map((e) => (
                <motion.button
                  key={e}
                  type="button"
                  whileTap={press}
                  onClick={() => {
                    setQuery(e);
                    lookup(e);
                  }}
                  className="focus-ring h-7 rounded-[8px] bg-control px-2.5 text-fg-2 hover:bg-control-hover hover:text-fg"
                >
                  {e}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Crumb({ label, current, onClick }: { label: string; current: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? "page" : undefined}
      className={`focus-ring h-6 shrink-0 rounded-[6px] px-1.5 transition-colors ${current ? "font-medium text-fg" : "text-fg-4 hover:bg-white/[0.06] hover:text-fg"}`}
    >
      {label}
    </button>
  );
}

/** A tick box with a third state, for a folder with only some of its files in. */
function Check({ state, label, onClick, disabled }: { state: "on" | "off" | "some"; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={state === "on" ? true : state === "some" ? "mixed" : false}
      aria-label={label}
      disabled={disabled}
      whileTap={disabled ? undefined : tap}
      onClick={onClick}
      className="focus-ring flex size-8 shrink-0 items-center justify-center rounded-[8px]"
    >
      <span
        className={`flex size-[18px] items-center justify-center rounded-[6px] transition-[background-color,box-shadow] duration-150 ease-out ${
          state === "off" ? "shadow-[inset_0_0_0_1.5px_var(--line-strong)]" : "bg-accent text-accent-fg"
        }`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {state !== "off" && (
            <motion.span
              key={state}
              className="flex"
              initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
            >
              {state === "on" ? <CheckIcon size={13} /> : <MinusIcon size={13} />}
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </motion.button>
  );
}

/* ---------- a web page ---------- */

function PageTab({ onAdd, freeTokens }: { onAdd: (i: Incoming) => void; freeTokens: number }) {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState<PageResult | null>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const read = async () => {
    if (!url.trim()) return;
    abort.current?.abort();
    const controller = (abort.current = new AbortController());
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/page", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }), signal: controller.signal });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't read that page.");
      setPage(body as PageResult);
    } catch (e) {
      if (controller.signal.aborted) return;
      setPage(null);
      setError(e instanceof Error ? e.message : "Couldn't read that page.");
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  // prose runs nearer four characters a token than code's three
  const tokens = page ? Math.round(page.text.length / 4) : 0;
  const host = page ? new URL(page.url).hostname.replace(/^www\./, "") : "";

  return (
    <div className="flex flex-1 flex-col gap-3">
      <Lookup value={url} onValue={setUrl} onSubmit={read} placeholder="Paste a link" label="Web address" action="Read" busy={busy} icon={<GlobeIcon size={16} className="shrink-0" />} />
      {error && <Problem>{error}</Problem>}
      <AnimatePresence mode="popLayout" initial={false}>
        {busy ? (
          <motion.div key="loading" {...swap} className="flex flex-col gap-2.5 px-2 pt-1" role="status" aria-label="Reading the page">
            <div className="skeleton h-4 w-3/5 rounded-[6px]" />
            <div className="skeleton h-3 w-1/4 rounded-[6px]" />
            <div className="skeleton mt-2 h-28 w-full rounded-[12px]" />
          </motion.div>
        ) : page ? (
          <motion.div key={page.url} {...swap} className="flex flex-1 flex-col gap-3">
            <div className="flex flex-col gap-0.5 px-2">
              <span className="line-clamp-2 text-[14px] font-medium text-pretty text-fg">{page.title}</span>
              <span className="text-[12px] text-fg-4">{host}</span>
            </div>
            <div className="px-2">
              <Budget tokens={tokens} free={freeTokens} note={`${page.text.length.toLocaleString("en")} characters`} />
            </div>
            {tokens > freeTokens && <Problem>Over by {k(tokens - freeTokens)} tokens. This page is too long for what&apos;s left in this chat.</Problem>}
            <p className="line-clamp-[8] rounded-[12px] bg-surface px-3 py-2.5 text-[13px] leading-relaxed whitespace-pre-line text-fg-3 shadow-[inset_0_0_0_1px_var(--line)]">{page.text.slice(0, 900).replace(/\n{2,}/g, "\n")}</p>
            <Footer
              note="Added as a document. Snap reads it on every turn."
              action="Add page"
              disabled={tokens > freeTokens}
              busy={false}
              onAction={() => onAdd({ files: [{ name: page.title, text: page.text }], source: { kind: "page", label: host, url: page.url } })}
            />
          </motion.div>
        ) : (
          <motion.p key="idle" {...swap} className="px-2 pt-1 text-[13px] leading-relaxed text-pretty text-fg-3">
            Paste a link to an article, a docs page or a README. Its text joins this chat as a document; pages that only appear after their scripts run can&apos;t be read.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

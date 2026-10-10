"use client";

import { AnimatePresence, motion } from "motion/react";
import { useContext, useState, type ReactNode } from "react";
import { CheckIcon, ChevronDownIcon, ChevronRightIcon, ChevronUpIcon, FolderIcon, NoteIcon } from "@/components/icons";
import type { CodeData, OptionsData, StatsData, Streaming, TreeData } from "@/lib/blocks";
import { easeOut, press } from "@/lib/motion";
import { Action, Arrive, Bar, BlockHeader, type BlockProps, ChatActionsContext, finite, MoreToggle, Tools } from "./shared";

/* ---------- stats: two to four headline figures, each with its trend ---------- */

/** Twelve points in the quiet tone; the current one in the accent. */
function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const W = 72;
  const H = 22;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (W - 4) + 2, H - 3 - ((v - lo) / (hi - lo || 1)) * (H - 6)]);
  const last = pts[pts.length - 1];
  return (
    <svg width={W} height={H} aria-hidden className="shrink-0 overflow-visible">
      <polyline points={pts.map((p) => p.join(",")).join(" ")} fill="none" stroke="var(--fg-5)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill="var(--accent)" />
    </svg>
  );
}

export function Stats({ data }: BlockProps<StatsData>) {
  const items = (data.items ?? []).slice(0, 4);
  return (
    <div className={`grid grid-cols-2 gap-2 ${items.length >= 4 ? "sm:grid-cols-4" : items.length === 3 ? "sm:grid-cols-3" : ""}`}>
      {items.map((s, i) => {
        const Icon = s?.direction === "up" ? ChevronUpIcon : s?.direction === "down" ? ChevronDownIcon : null;
        const trend = (s?.trend ?? []).filter(finite);
        return (
          <Arrive key={i} className="flex flex-col gap-1 rounded-[12px] bg-surface px-3.5 py-3">
            <span className="text-[12px] text-fg-4">{s?.label}</span>
            <div className="flex items-end justify-between gap-2">
              {/* proportional figures at this size: tabular digits look loose */}
              <span className="text-[24px] leading-tight font-medium tracking-[-0.02em] text-fg">{s?.value}</span>
              <Sparkline values={trend} />
            </div>
            {s?.delta && (
              <span className="flex items-center gap-1 text-[12px] text-fg-3 tabular-nums">
                {/* direction is the icon and the sign; the colour only says whether that's good */}
                {Icon && <Icon size={13} className={s.good ? "text-good" : "text-bad"} aria-label={s.good ? "good" : "bad"} />}
                {s.delta}
              </span>
            )}
          </Arrive>
        );
      })}
    </div>
  );
}

export const statsText = (d: Streaming<StatsData>) => (d.items ?? []).map((s) => `${s?.label}: ${s?.value}${s?.delta ? ` (${s.delta})` : ""}`).join("\n");

export function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2 rounded-[12px] bg-surface px-3.5 py-3">
          <Bar className="h-2.5 w-1/2" />
          <Bar className="h-6 w-2/3" />
          <Bar className="h-2.5 w-2/5" />
        </div>
      ))}
    </div>
  );
}

/* ---------- code: quiet syntax colour, long files fold ---------- */

const KEYWORDS =
  /^(?:const|let|var|function|return|import|export|from|default|if|else|for|while|do|switch|case|break|continue|class|extends|new|async|await|try|catch|finally|throw|typeof|instanceof|in|of|def|lambda|pass|elif|with|as|fn|pub|use|mod|impl|struct|enum|type|interface|public|private|static|void|true|false|null|undefined|None|True|False|nil|echo|then|fi|done)$/;
const TOKEN = /(\/\/[^\n]*|#(?![!{])[^\n]*|\/\*[\s\S]*?\*\/|`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b)/g;

/** A light, honest tokenizer: comments, strings, numbers, keywords. Everything else keeps the base tone. */
export function highlight(code: string, language: string): ReactNode[] {
  const out: ReactNode[] = [];
  const hashComments = /^(py|python|rb|ruby|bash|sh|shell|zsh|yaml|yml|toml)$/i.test(language);
  let last = 0;
  for (const m of code.matchAll(TOKEN)) {
    const t = m[0];
    if (m.index > last) out.push(code.slice(last, m.index));
    const cls =
      t.startsWith("//") || t.startsWith("/*") || (t.startsWith("#") && hashComments)
        ? "text-fg-5 italic"
        : /^["'`]/.test(t)
          ? "text-[#a6c79c]"
          : /^\d/.test(t)
            ? "text-[#d9b07a]"
            : KEYWORDS.test(t)
              ? "text-fg font-medium"
              : null;
    out.push(cls ? <span key={m.index} className={cls}>{t}</span> : t);
    last = m.index + t.length;
  }
  out.push(code.slice(last));
  return out;
}

const CODE_FOLD = 16;
/** Twelve lines of 13px code at 1.625 line height, plus the block's padding. */
const COLLAPSED = Math.round(12 * 13 * 1.625 + 28);

export function Code({ data }: BlockProps<CodeData>) {
  const code = data.code ?? "";
  const lines = code.split("\n");
  const [all, setAll] = useState(false);
  const long = lines.length > CODE_FOLD;
  return (
    <div className="flex flex-col gap-1.5">
      {/* a long file shows twelve lines; "Show more" opens the window to its full height rather than jumping */}
      <motion.div
        className="relative overflow-hidden rounded-[12px]"
        initial={false}
        animate={{ height: long && !all ? COLLAPSED : "auto" }}
        transition={{ duration: 0.32, ease: easeOut }}
      >
        <pre className="overflow-x-auto bg-surface p-3.5 font-mono text-[13px] leading-relaxed text-fg-2">
          {/* numbers in their own column, out of the way when the code is selected or copied */}
          <span className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4">
            <span aria-hidden className="text-end text-fg-6 select-none">
              {code.split("\n").map((_, i) => (
                <span key={i} className="block tabular-nums">
                  {i + 1}
                </span>
              ))}
            </span>
            <code className="block">{highlight(code, data.language ?? "")}</code>
          </span>
        </pre>
        {long && (
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-linear-to-b from-surface/0 to-surface"
            initial={false}
            animate={{ opacity: all ? 0 : 1 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </motion.div>
      {long && (
        <div className="px-1">
          <MoreToggle hidden={lines.length - 12} open={all} onToggle={() => setAll((a) => !a)} noun="lines" />
        </div>
      )}
    </div>
  );
}

export function CodeSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Bar className="ms-3 mt-2 h-2.5 w-24" />
      <div className="flex flex-col gap-2 rounded-[12px] bg-surface p-3.5">
        {["w-3/5", "w-4/5", "w-2/5", "w-1/2"].map((w) => (
          <Bar key={w} className={`h-3 ${w}`} />
        ))}
      </div>
    </div>
  );
}

/* ---------- options: a question back, answered with a tap (or several) ---------- */

export function Options({ data, answer, settled }: BlockProps<OptionsData>) {
  const { send, busy, compose } = useContext(ChatActionsContext);
  const [picked, setPicked] = useState<string[]>([]);
  const multiple = !!data.multiple;
  const answered = !!answer;
  const chosen = (label?: string) => !!label && !!answer && (answer === label || answer.split(/, | and /).includes(label));
  const locked = answered || busy || !settled;
  const join = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

  return (
    <div className="flex flex-col gap-2.5 px-2 py-1">
      <BlockHeader title={data.question} meta={multiple && !answered ? "Pick any" : undefined} />
      <ul className="flex flex-col gap-1">
        {(data.options ?? []).map((o, i) => {
          const label = o?.label ?? "";
          const on = multiple ? picked.includes(label) : false;
          const was = chosen(label);
          return (
            <Arrive as="li" key={i}>
              <motion.button
                type="button"
                role={multiple ? "checkbox" : undefined}
                aria-checked={multiple ? on : undefined}
                disabled={locked}
                onClick={() => (multiple ? setPicked((p) => (p.includes(label) ? p.filter((x) => x !== label) : [...p, label])) : send(label))}
                className={`focus-ring group flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-start transition-[background-color,box-shadow,opacity] duration-200 ease-out enabled:active:bg-control-hover ${
                  was || on ? "bg-control shadow-[inset_0_0_0_1px_var(--line-strong)]" : answered ? "opacity-45" : "bg-surface enabled:hover:bg-surface-hover"
                }`}
              >
                {multiple && (
                  <span
                    className={`flex size-[18px] shrink-0 items-center justify-center rounded-[6px] transition-[background-color,box-shadow] duration-200 ease-out ${
                      on || was ? "bg-accent text-accent-fg" : "shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]"
                    }`}
                  >
                    {(on || was) && <CheckIcon size={12} />}
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[14px] text-fg">{label}</span>
                  {o?.detail && <span className="text-[12px] text-fg-4">{o.detail}</span>}
                </span>
                {!multiple &&
                  (was ? (
                    <CheckIcon size={16} className="shrink-0 text-fg" aria-label="Chosen" />
                  ) : (
                    !answered && <ChevronRightIcon size={16} className="shrink-0 text-fg-5 transition-colors group-hover:text-fg-2" />
                  ))}
              </motion.button>
            </Arrive>
          );
        })}
      </ul>
      {!answered && settled && (
        <div className="flex items-center justify-between gap-2">
          <Action label="Something else…" icon={null} onClick={() => compose("")} />
          <AnimatePresence>
            {multiple && picked.length > 0 && (
              <motion.button
                type="button"
                whileTap={press}
                disabled={busy}
                onClick={() => send(join(picked))}
                className="focus-ring h-8 rounded-[10px] bg-accent px-3 text-[13px] font-medium text-accent-fg"
                initial={{ opacity: 0, scale: 0.96, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.18, ease: easeOut } }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.1 } }}
              >
                Send {picked.length}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export function OptionsSkeleton() {
  return (
    <div className="flex flex-col gap-2.5 px-2 py-1">
      <Bar className="h-3.5 w-2/5" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton h-12 rounded-[12px]" />
      ))}
    </div>
  );
}

/* ---------- tree: a hierarchy that folds ---------- */

export function Tree({ data }: BlockProps<TreeData>) {
  const items = (data.items ?? []).filter((i) => i?.name).map((i) => ({ ...i, depth: Math.max(0, Math.min(6, Math.round(i?.depth ?? 0))) }));
  const files = data.kind === "files";
  const [closed, setClosed] = useState<Set<number>>(new Set());
  const isParent = (i: number) => (items[i + 1]?.depth ?? -1) > items[i].depth;
  const parents = items.map((_, i) => i).filter(isParent);

  // Hide whatever sits under a closed parent.
  const visible: number[] = [];
  let hideBelow = Infinity;
  items.forEach((it, i) => {
    if (it.depth <= hideBelow) hideBelow = Infinity;
    if (hideBelow !== Infinity) return;
    visible.push(i);
    if (closed.has(i)) hideBelow = it.depth;
  });

  const toggle = (i: number) =>
    setClosed((c) => {
      const next = new Set(c);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  return (
    <div className="flex flex-col gap-1 px-2 py-1">
      <ul className="flex flex-col">
        <AnimatePresence initial={false}>
        {visible.map((i) => {
          const item = items[i];
          const parent = isParent(i);
          const open = !closed.has(i);
          const Icon = files ? (parent || item.name?.endsWith("/") ? FolderIcon : NoteIcon) : null;
          const row = (
            <>
              {Array.from({ length: item.depth }, (_, d) => (
                <span key={d} aria-hidden className="absolute inset-y-0 w-px bg-line" style={{ left: d * 18 + 13 }} />
              ))}
              <span style={{ width: item.depth * 18 }} className="shrink-0" />
              <span className="flex w-3.5 shrink-0 justify-center text-fg-5">
                {parent && <ChevronRightIcon size={13} className={`transition-transform duration-200 ease-out ${open ? "rotate-90" : ""}`} />}
              </span>
              {Icon ? (
                <Icon size={15} className="shrink-0 text-fg-4" />
              ) : (
                <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${item.depth === 0 ? "bg-fg" : "bg-fg-5"}`} />
              )}
              <span className={`truncate ${files ? "font-mono text-[13px]" : "text-[14px]"} ${item.depth === 0 || parent ? "text-fg" : "text-fg-2"}`}>{item.name}</span>
              {item.note && <span className="truncate text-[12px] text-fg-5">{item.note}</span>}
            </>
          );
          return (
            <motion.li
              key={i}
              className="overflow-hidden"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 32, transition: { duration: 0.24, ease: easeOut } }}
              exit={{ opacity: 0, height: 0, transition: { duration: 0.16, ease: easeOut } }}
            >
              {parent ? (
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => toggle(i)}
                  className="focus-ring relative flex h-8 w-full items-center gap-2 rounded-[8px] px-1.5 text-start transition-colors hover:bg-white/[0.04]"
                >
                  {row}
                </button>
              ) : (
                <div className="relative flex h-8 items-center gap-2 px-1.5">{row}</div>
              )}
            </motion.li>
          );
        })}
        </AnimatePresence>
      </ul>
      {parents.length > 1 && (
        <Tools>
          <Action
            label={closed.size ? "Expand all" : "Collapse all"}
            icon={null}
            onClick={() => setClosed(closed.size ? new Set() : new Set(parents.filter((p) => items[p].depth <= 1)))}
          />
        </Tools>
      )}
    </div>
  );
}

export const treeText = (d: Streaming<TreeData>) => (d.items ?? []).map((i) => `${"  ".repeat(Math.max(0, i?.depth ?? 0))}${i?.name}${i?.note ? `  (${i.note})` : ""}`).join("\n");

export function TreeSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-2 py-2">
      {[0, 1, 1, 2, 1, 0].map((d, i) => (
        <div key={i} className="flex items-center gap-2" style={{ paddingInlineStart: d * 18 }}>
          <div className="skeleton size-3.5 rounded-[4px]" />
          <Bar className={`h-3 ${["w-28", "w-36", "w-24", "w-32", "w-20", "w-28"][i]}`} />
        </div>
      ))}
    </div>
  );
}

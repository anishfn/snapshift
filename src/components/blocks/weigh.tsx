"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { CheckIcon, XIcon } from "@/components/icons";
import type { ProsConsData, ScorecardData } from "@/lib/blocks";
import { easeOut } from "@/lib/motion";
import { Action, Arrive, Bar, BlockHeader, type BlockProps, finite } from "./shared";

/* ---------- pros & cons: two columns, then the weighing ---------- */

export function ProsCons({ data }: BlockProps<ProsConsData>) {
  const pros = (data.pros ?? []).filter((p): p is string => !!p);
  const cons = (data.cons ?? []).filter((c): c is string => !!c);
  const column = (title: string, list: string[], good: boolean) => (
    <section className="flex flex-col gap-2 rounded-[12px] bg-surface p-3">
      <h4 className="flex items-center justify-between text-[12px] text-fg-3">
        <span className="flex items-center gap-1.5">
          {good ? <CheckIcon size={14} className="text-good" /> : <XIcon size={14} className="text-bad" />}
          {title}
        </span>
        <span className="text-fg-5 tabular-nums">{list.length}</span>
      </h4>
      <ul className="flex flex-col gap-1.5">
        {list.map((p, i) => (
          <Arrive as="li" key={i} className="text-[14px] leading-snug text-pretty text-fg-2">
            {p}
          </Arrive>
        ))}
      </ul>
    </section>
  );
  return (
    <div className="flex flex-col gap-3 px-2 py-1">
      <BlockHeader title={data.subject} />
      <div className="grid gap-2 sm:grid-cols-2">
        {column("For", pros, true)}
        {column("Against", cons, false)}
      </div>
      {data.verdict && <p className="text-[14px] leading-relaxed text-pretty text-fg-2">{data.verdict}</p>}
    </div>
  );
}

export const prosConsText = (d: BlockProps<ProsConsData>["data"]) =>
  [d.subject, "For:", ...(d.pros ?? []).map((p) => `+ ${p}`), "Against:", ...(d.cons ?? []).map((c) => `- ${c}`), d.verdict].filter(Boolean).join("\n");

export function ProsConsSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-2 py-1">
      <Bar className="h-3.5 w-1/3" />
      <div className="grid gap-2 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-2 rounded-[12px] bg-surface p-3">
            <Bar className="h-2.5 w-12" />
            <Bar className="h-3 w-4/5" />
            <Bar className="h-3 w-3/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- scorecard: the overall score, then each criterion as a meter ---------- */

const fmt = (v: number) => (Number.isInteger(v) ? `${v}` : v.toFixed(1));

/** A ring meter: the track is a lighter step of the same tone, the fill carries the score. */
function Ring({ value, max }: { value: number; max: number }) {
  const R = 30;
  const C = 2 * Math.PI * R;
  const f = Math.max(0, Math.min(1, value / (max || 1)));
  return (
    <div className="relative size-[76px] shrink-0">
      <svg viewBox="0 0 76 76" className="size-full -rotate-90" aria-hidden>
        <circle cx="38" cy="38" r={R} fill="none" stroke="var(--line)" strokeWidth={6} />
        <motion.circle
          cx="38"
          cy="38"
          r={R}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - f) }}
          transition={{ duration: 0.7, ease: easeOut }}
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[20px] font-medium text-fg">{fmt(value)}</span>
        <span className="mt-0.5 text-[10px] text-fg-5">of {fmt(max)}</span>
      </span>
    </div>
  );
}

export function Scorecard({ data }: BlockProps<ScorecardData>) {
  const max = finite(data.max) && data.max > 0 ? data.max : 10;
  const criteria = (data.criteria ?? []).filter((c) => c?.name && finite(c.score)) as { name: string; score: number; note?: string }[];
  const [byScore, setByScore] = useState(false);
  const list = byScore ? [...criteria].sort((a, b) => a.score - b.score) : criteria;
  return (
    <div className="flex flex-col gap-4 px-2 py-1">
      <div className="flex items-center gap-4">
        {finite(data.overall) && <Ring value={data.overall} max={max} />}
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <BlockHeader title={data.subject}>
            {criteria.length > 2 && <Action label={byScore ? "As written" : "Weakest first"} icon={null} pressed={byScore} onClick={() => setByScore((b) => !b)} />}
          </BlockHeader>
          <p className="text-[12px] text-fg-4">{criteria.length} criteria, each out of {fmt(max)}</p>
        </div>
      </div>
      <ul className="flex flex-col gap-3">
        {list.map((c) => (
          <Arrive as="li" reorder key={c.name} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-[13px]">
              <span className="text-fg">{c.name}</span>
              <span className="text-fg-3 tabular-nums">
                <span className="text-fg">{fmt(c.score)}</span>/{fmt(max)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <motion.div
                className="h-full origin-left rounded-full bg-accent"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: Math.max(0, Math.min(1, c.score / max)) }}
                transition={{ duration: 0.5, ease: easeOut }}
              />
            </div>
            {c.note && <p className="text-[12px] leading-snug text-pretty text-fg-4">{c.note}</p>}
          </Arrive>
        ))}
      </ul>
    </div>
  );
}

export const scorecardText = (d: BlockProps<ScorecardData>["data"]) =>
  [`${d.subject}: ${d.overall}/${d.max}`, ...(d.criteria ?? []).map((c) => `- ${c?.name}: ${c?.score}/${d.max}${c?.note ? `. ${c.note}` : ""}`)].join("\n");

export function ScorecardSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-2 py-1">
      <div className="flex items-center gap-4">
        <div className="skeleton size-[76px] rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Bar className="h-3.5 w-1/3" />
          <Bar className="h-2.5 w-1/4" />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <Bar className="h-3 w-1/3" />
          <Bar className="h-1.5 w-full" />
        </div>
      ))}
    </div>
  );
}

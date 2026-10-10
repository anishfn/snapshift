"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { MinusIcon, PlusIcon, UsersIcon } from "@/components/icons";
import type { BreakdownData } from "@/lib/blocks";
import { easeOut } from "@/lib/motion";
import { format } from "./chart";
import { Action, Arrive, Bar, BlockHeader, type BlockProps, finite, Swap } from "./shared";

// Line items that add up: each with its share as a thin bar, the total under a hairline, and the split per person
// with a stepper, so "what if five of us go" is one tap.

export function Breakdown({ data }: BlockProps<BreakdownData>) {
  const unit = data.unit ?? "";
  const items = (data.items ?? []).filter((i) => i?.label && finite(i.amount)) as { label: string; amount: number; note?: string }[];
  const total = items.reduce((s, i) => s + i.amount, 0);
  const max = Math.max(0, ...items.map((i) => i.amount)) || 1;
  const [people, setPeople] = useState<number | null>(null);
  const n = people ?? (finite(data.people) && data.people > 0 ? data.people : 1);

  return (
    <div className="flex flex-col gap-3 px-2 py-1">
      <BlockHeader title={data.title} />
      <ul className="flex flex-col">
        {items.map((it, i) => (
          <Arrive as="li" key={i} className="flex flex-col gap-1 border-b border-line py-2 last:border-b-0">
            <div className="flex items-baseline justify-between gap-3 text-[14px]">
              <span className="min-w-0 text-fg-2">
                {it.label}
                {it.note && <span className="ms-2 text-[12px] text-fg-5">{it.note}</span>}
              </span>
              <span className="shrink-0 text-fg tabular-nums">{format(it.amount, unit, true)}</span>
            </div>
            <div className="h-1 overflow-hidden rounded-full">
              <motion.div
                className="h-full origin-left rounded-full bg-white/[0.16]"
                style={{ width: `${(it.amount / max) * 100}%` }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.45, ease: easeOut, delay: i * 0.03 }}
              />
            </div>
          </Arrive>
        ))}
      </ul>
      <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line-strong pt-3">
        <div className="flex flex-col">
          <span className="text-[12px] text-fg-4">Total</span>
          <span className="text-[22px] leading-tight font-medium tracking-[-0.02em] text-fg">{format(total, unit, true)}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex h-7 items-center gap-0.5 rounded-[8px] bg-surface ps-2 pe-0.5 text-[12px] text-fg-3">
            <UsersIcon size={13} className="me-1 text-fg-5" />
            <span className="min-w-[4.5rem] tabular-nums">
              <Swap value={n} className="text-fg" /> {n === 1 ? "person" : "people"}
            </span>
            <Action showLabel={false} label="Fewer people" icon={<MinusIcon size={13} />} onClick={() => setPeople(Math.max(1, n - 1))} />
            <Action showLabel={false} label="More people" icon={<PlusIcon size={13} />} onClick={() => setPeople(Math.min(99, n + 1))} />
          </span>
          <AnimatePresence initial={false}>
            {n > 1 && (
              <motion.span
                className="flex flex-col items-end"
                initial={{ opacity: 0, filter: "blur(4px)" }}
                animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 0.2, ease: easeOut } }}
                exit={{ opacity: 0, filter: "blur(4px)", transition: { duration: 0.12 } }}
              >
                <span className="text-[12px] text-fg-4">Each</span>
                <Swap value={format(Math.round((total / n) * 100) / 100, unit, true)} className="text-[16px] font-medium text-fg tabular-nums" />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export const breakdownText = (d: BlockProps<BreakdownData>["data"]) => {
  const items = (d.items ?? []).filter((i) => finite(i?.amount));
  const total = items.reduce((s, i) => s + (i?.amount ?? 0), 0);
  return [d.title, ...items.map((i) => `${i?.label}: ${format(i?.amount ?? 0, d.unit ?? "")}`), `Total: ${format(total, d.unit ?? "")}`].filter(Boolean).join("\n");
};

export function BreakdownSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-2 py-1">
      <Bar className="h-3.5 w-1/3" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-1.5 py-1">
          <div className="flex justify-between">
            <Bar className="h-3 w-1/3" />
            <Bar className="h-3 w-12" />
          </div>
          <Bar className="h-1 w-1/2" />
        </div>
      ))}
      <Bar className="h-6 w-24" />
    </div>
  );
}

"use client";

import { motion } from "motion/react";
import { useState } from "react";
import { CheckIcon, ChevronDownIcon, XIcon } from "@/components/icons";
import type { DecisionData, TableData } from "@/lib/blocks";
import { easeOut } from "@/lib/motion";
import { Arrive, Bar, type BlockProps, MoreToggle } from "./shared";

/* ---------- decision: the answer first, then why ---------- */

const ANSWERS = {
  yes: { label: "Yes", Icon: CheckIcon },
  no: { label: "No", Icon: XIcon },
  depends: { label: "It depends", Icon: null },
} as const;

export function Verdict({ data }: BlockProps<DecisionData>) {
  const confidence = typeof data.confidence === "number" ? Math.max(0, Math.min(1, data.confidence)) : null;
  const answer = data.answer && data.answer in ANSWERS ? ANSWERS[data.answer] : null;
  return (
    <div className="flex flex-col gap-3 px-2 py-1">
      <div className="flex flex-col gap-1.5">
        {data.question && <span className="text-[12px] text-fg-4">{data.question}</span>}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {answer && (
            <Arrive className="flex h-7 items-center gap-1 rounded-[8px] bg-accent ps-1.5 pe-2.5 text-[13px] font-medium text-accent-fg">
              {answer.Icon ? <answer.Icon size={15} /> : <span className="w-1" />}
              {answer.label}
            </Arrive>
          )}
          {data.verdict && <p className="text-[18px] leading-snug font-medium tracking-[-0.01em] text-balance text-fg">{data.verdict}</p>}
        </div>
      </div>
      {confidence !== null && (
        <div className="flex items-center gap-2.5">
          <div className="h-1 w-24 overflow-hidden rounded-full bg-white/[0.1]">
            <motion.div
              className="h-full origin-left rounded-full bg-accent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: confidence }}
              transition={{ duration: 0.5, ease: easeOut }}
            />
          </div>
          <span className="text-[12px] text-fg-4 tabular-nums">{Math.round(confidence * 100)}% sure</span>
        </div>
      )}
      {!!data.reasons?.length && (
        <ul className="flex list-disc flex-col gap-1 ps-5 text-[14px] leading-snug text-fg-2 marker:text-fg-5">
          {data.reasons.map((r, i) => (
            <Arrive as="li" key={i}>
              {r}
            </Arrive>
          ))}
        </ul>
      )}
      {data.caveat && <p className="text-[12px] text-pretty text-fg-4">{data.caveat}</p>}
    </div>
  );
}

export const decisionText = (d: BlockProps<DecisionData>["data"]) =>
  [d.question, `${d.answer ? `${ANSWERS[d.answer]?.label}. ` : ""}${d.verdict ?? ""}`, ...(d.reasons ?? []).map((r) => `- ${r}`), d.caveat].filter(Boolean).join("\n");

export function VerdictSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-2 py-1">
      <Bar className="h-2.5 w-1/4" />
      <div className="flex gap-3">
        <Bar className="h-7 w-14" />
        <Bar className="h-5 w-1/2" />
      </div>
      <Bar className="h-1 w-24" />
      <Bar className="h-3 w-4/5" />
      <Bar className="h-3 w-2/3" />
    </div>
  );
}

/* ---------- table: sort by any column, numbers to the right, long tables fold ---------- */

const FOLD = 8;
/**
 * A cell as a number, if the whole cell reads as one: "$1,284", "12.5%", "229 KB", "-$64.30". A sentence or an id
 * with a digit in it ("Rule 2: duplicate charge", "T-1031", "2019-2020") is text, and stays on the left.
 */
const asNumber = (s?: string) => {
  const m = s?.replace(/[,\s]/g, "").match(/^([-+−])?(?:[^\w+−-]{1,2}|(?:Rs|USD|EUR|GBP|INR)\.?)?(\d+(?:\.\d+)?)\D{0,10}$/);
  return m ? Number(m[2]) * (m[1] && m[1] !== "+" ? -1 : 1) : null;
};

export function Table({ data, settled }: BlockProps<TableData>) {
  const columns = (data.columns ?? []).filter((c): c is string => typeof c === "string");
  const rows = (data.rows ?? []).map((r) => columns.map((_, j) => (typeof r?.[j] === "string" ? (r[j] as string) : "")));
  const numeric = columns.map((_, j) => {
    const cells = rows.map((r) => r[j]).filter(Boolean);
    return cells.length > 0 && cells.filter((c) => asNumber(c) !== null).length / cells.length >= 0.7;
  });
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const [all, setAll] = useState(false);

  const sorted = sort
    ? [...rows].sort((a, b) => {
        const x = a[sort.col];
        const y = b[sort.col];
        const d = numeric[sort.col] ? (asNumber(x) ?? -Infinity) - (asNumber(y) ?? -Infinity) : x.localeCompare(y);
        return d * sort.dir;
      })
    : rows;
  const shown = all ? sorted : sorted.slice(0, FOLD);
  const cycle = (col: number) =>
    setSort((s) => (s?.col !== col ? { col, dir: numeric[col] ? -1 : 1 } : s.dir === (numeric[col] ? -1 : 1) ? { col, dir: (s.dir * -1) as 1 | -1 } : null));

  return (
    <div className="flex flex-col gap-2 px-2 py-1">
      <div className="-mx-2 overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead className="border-b border-line-strong">
            <tr>
              {columns.map((c, j) => {
                const active = sort?.col === j;
                return (
                  <th
                    key={j}
                    scope="col"
                    aria-sort={active ? (sort!.dir === 1 ? "ascending" : "descending") : "none"}
                    className={`px-2 py-1 font-normal ${j === 0 ? "sticky left-0 z-10 bg-raised" : ""}`}
                  >
                    <button
                      type="button"
                      disabled={!settled}
                      onClick={() => cycle(j)}
                      className={`focus-ring flex h-7 w-full items-center gap-1 rounded-[6px] px-2 text-[12px] whitespace-nowrap transition-colors enabled:hover:bg-white/[0.05] ${
                        numeric[j] ? "flex-row-reverse text-end" : "text-start"
                      } ${active ? "text-fg" : "text-fg-4"}`}
                    >
                      {c}
                      {/* one arrow that fades in and turns over with the direction */}
                      <ChevronDownIcon
                        size={12}
                        aria-hidden
                        className={`shrink-0 transition-[opacity,rotate] duration-200 ease-out ${active ? "opacity-100" : "opacity-0"} ${active && sort?.dir === 1 ? "rotate-180" : ""}`}
                      />
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <Arrive as="tr" reorder key={row.join("|")} className="group border-t border-line">
                {row.map((cell, j) => (
                  <td
                    key={j}
                    className={`px-4 py-2 align-top transition-colors group-hover:bg-white/[0.025] ${numeric[j] ? "text-end tabular-nums" : ""} ${
                      j === 0 ? "sticky left-0 z-10 bg-raised font-medium text-fg" : "text-fg-2"
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </Arrive>
            ))}
          </tbody>
        </table>
      </div>
      <MoreToggle hidden={rows.length - FOLD} open={all} onToggle={() => setAll((a) => !a)} />
    </div>
  );
}

/** Tab-separated, so it pastes into a spreadsheet as cells. */
export const tableText = (d: BlockProps<TableData>["data"]) => [d.columns ?? [], ...(d.rows ?? [])].map((r) => (r ?? []).join("\t")).join("\n");

export function TableSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-2 py-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="grid grid-cols-3 gap-4">
          <Bar className={`h-3 ${i ? "w-3/4" : "w-1/2"}`} />
          <Bar className="h-3 w-2/3" />
          <Bar className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

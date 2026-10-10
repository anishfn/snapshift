"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { CheckIcon } from "@/components/icons";
import { inline } from "@/components/prose";
import type { ChecklistData, StepsData, TimelineData } from "@/lib/blocks";
import { easeOut, iconSwap, rowPress, tap } from "@/lib/motion";
import { Arrive, Bar, BlockHeader, type BlockProps, MoreToggle, Swap } from "./shared";

const FOLD = 6;

/** Rows that open and close with a "Show more": height and opacity, quick out. */
const fold = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto", transition: { duration: 0.28, ease: easeOut } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.18, ease: easeOut } },
};

/**
 * A round check. Pressing it gives a slight squeeze (the row itself doesn't scale); the fill fades in and the tick
 * draws itself, so a change of state is never a jump.
 */
function Check({ done }: { done: boolean }) {
  return (
    <span
      className={`relative flex size-[18px] shrink-0 items-center justify-center rounded-full transition-[background-color,box-shadow,scale] duration-150 ease-out group-active:scale-90 ${
        done ? "bg-accent text-accent-fg shadow-[inset_0_0_0_1.5px_var(--color-accent)]" : "bg-transparent shadow-[inset_0_0_0_1.5px_var(--color-line-strong)]"
      }`}
    >
      <svg viewBox="0 0 18 18" className="size-3" aria-hidden>
        <motion.path
          d="M4.4 9.6l3 3 6.2-6.4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
          transition={{ duration: done ? 0.22 : 0.12, ease: easeOut }}
        />
      </svg>
    </span>
  );
}

/** A thin bar of how much is done. */
function Progress({ done, total }: { done: number; total: number }) {
  return (
    <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]" role="progressbar" aria-valuenow={done} aria-valuemax={total} aria-label="Done">
      <motion.div
        className="h-full origin-left rounded-full bg-accent"
        initial={false}
        animate={{ scaleX: total ? done / total : 0 }}
        transition={{ duration: 0.35, ease: easeOut }}
      />
    </div>
  );
}

/** Done text: dims and strikes through gradually (the line fades in) rather than switching. */
const struck = (done: boolean) =>
  `line-through transition-[color,text-decoration-color] duration-200 ease-out ${done ? "text-fg-4 decoration-fg-6" : "text-fg decoration-transparent"}`;

/* ---------- timeline ---------- */

export function Timeline({ data }: BlockProps<TimelineData>) {
  const events = data.events ?? [];
  const [all, setAll] = useState(false);
  const shown = all ? events : events.slice(0, FOLD);
  return (
    <div className="flex flex-col gap-1 px-2 py-1">
      <ol className="flex flex-col">
        <AnimatePresence initial={false}>
          {shown.map((e, i) => {
            const item = (
              // when | dot and rail | what: dates line up in their own column so the timeline scans like a schedule
              <div className="grid grid-cols-[minmax(3.5rem,auto)_12px_minmax(0,1fr)] gap-x-3 pb-4">
                <span className="pt-[1px] text-end text-[12px] leading-5 whitespace-nowrap text-fg-4 tabular-nums">{e?.when}</span>
                <div className="relative flex justify-center pt-[6px]">
                  <span className={`relative z-10 size-2 rounded-full ring-4 ring-raised ${i === events.length - 1 ? "bg-accent" : "bg-fg-4"}`} />
                  {/* the rail runs from under this dot to the next one, across the gap between items */}
                  {i < shown.length - 1 && <span aria-hidden className="absolute top-[14px] -bottom-[22px] left-[5.5px] w-px bg-line" />}
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <h3 className="text-[14px] leading-5 font-medium text-fg">{e?.title}</h3>
                  {e?.detail && <p className="text-[13px] leading-snug text-pretty text-fg-3">{inline(e.detail)}</p>}
                </div>
              </div>
            );
            return i < FOLD ? (
              <Arrive as="li" key={i}>
                {item}
              </Arrive>
            ) : (
              <motion.li key={i} {...fold} className="overflow-hidden">
                {item}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
      <MoreToggle hidden={events.length - FOLD} open={all} onToggle={() => setAll((a) => !a)} />
    </div>
  );
}

export const timelineText = (d: BlockProps<TimelineData>["data"]) => (d.events ?? []).map((e) => `${e?.when}: ${e?.title}. ${e?.detail ?? ""}`).join("\n");

export function TimelineSkeleton() {
  return (
    <div className="flex flex-col gap-5 px-2 py-1">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="skeleton mt-[3px] size-2 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Bar className="h-2.5 w-16" />
            <Bar className="h-3.5 w-2/5" />
            <Bar className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- checklist: tick things off; it's saved with the conversation ---------- */

export function Checklist({ data, settled, onChange }: BlockProps<ChecklistData>) {
  const items = data.items ?? [];
  const done = items.filter((i) => i?.done).length;
  const live = settled && !!onChange;
  const toggle = (i: number) => {
    if (!live) return;
    onChange!({ ...data, items: items.map((it, j) => (j === i ? { ...it, done: !it?.done } : it)) });
  };
  return (
    <div className="flex flex-col gap-3 px-2 py-1">
      <BlockHeader title={data.title} meta={items.length > 0 && <Swap value={`${done} of ${items.length} done`} />} />
      {items.length > 0 && <Progress done={done} total={items.length} />}
      <ul className="-mx-1 flex flex-col">
        {items.map((item, i) => (
          <Arrive as="li" key={i}>
            <button
              type="button"
              role="checkbox"
              aria-checked={!!item?.done}
              disabled={!live}
              onClick={() => toggle(i)}
              className={`group focus-ring flex w-full items-start gap-2.5 rounded-[10px] px-1.5 py-1.5 text-start enabled:hover:bg-white/[0.04] ${rowPress}`}
            >
              <span className="mt-px">
                <Check done={!!item?.done} />
              </span>
              <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-3">
                <span className={`text-[14px] leading-snug ${struck(!!item?.done)}`}>{item?.text}</span>
                {item?.note && <span className="text-[12px] text-fg-4">{item.note}</span>}
              </span>
            </button>
          </Arrive>
        ))}
      </ul>
    </div>
  );
}

export const checklistText = (d: BlockProps<ChecklistData>["data"]) =>
  [d.title, ...(d.items ?? []).map((i) => `- [${i?.done ? "x" : " "}] ${i?.text}${i?.note ? ` (${i.note})` : ""}`)].filter(Boolean).join("\n");

export function ChecklistSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-2 py-1">
      <Bar className="h-3.5 w-1/3" />
      <Bar className="h-1 w-full" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="skeleton size-[18px] shrink-0 rounded-full" />
          <Bar className={`h-3 ${["w-1/2", "w-2/5", "w-3/5", "w-1/3", "w-1/2"][i]}`} />
        </div>
      ))}
    </div>
  );
}

/* ---------- steps: numbered, and each can be marked done as you go ---------- */

type StepsState = StepsData & { done?: number[] };

export function Steps({ data, settled, onChange }: BlockProps<StepsState>) {
  const steps = data.steps ?? [];
  const done = new Set((data.done ?? []).filter((n): n is number => typeof n === "number"));
  const live = settled && !!onChange;
  const toggle = (i: number) => {
    if (!live) return;
    const next = new Set(done);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    onChange!({ ...data, done: [...next] });
  };
  return (
    <div className="flex flex-col gap-3 px-2 py-1">
      <AnimatePresence initial={false}>
        {done.size > 0 && (
          <motion.div {...fold}>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Progress done={done.size} total={steps.length} />
              </div>
              <Swap value={`${done.size} of ${steps.length} done`} className="shrink-0 text-[12px] text-fg-4 tabular-nums" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <ol className="-mx-1 flex flex-col">
        {steps.map((s, i) => {
          const isDone = done.has(i);
          return (
            <Arrive as="li" key={i} className="relative flex gap-3 rounded-[10px] px-1.5 py-2">
              {/* the rail between numbers; it brightens where two done steps meet */}
              {i < steps.length - 1 && (
                <span
                  aria-hidden
                  className={`absolute top-[36px] -bottom-[4px] left-[17.5px] w-px transition-colors duration-300 ${isDone && done.has(i + 1) ? "bg-fg-4" : "bg-line"}`}
                />
              )}
              <motion.button
                type="button"
                role="checkbox"
                aria-checked={isDone}
                aria-label={`Step ${i + 1} done`}
                disabled={!live}
                whileTap={live ? tap : undefined}
                onClick={() => toggle(i)}
                className={`focus-ring flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-medium tabular-nums transition-colors duration-200 ease-out ${
                  isDone ? "bg-accent text-accent-fg" : "bg-control text-fg-2 enabled:hover:bg-control-hover"
                }`}
              >
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={isDone ? "done" : "n"} {...iconSwap} className="flex">
                    {isDone ? <CheckIcon size={13} /> : i + 1}
                  </motion.span>
                </AnimatePresence>
              </motion.button>
              <div className="flex min-w-0 flex-col gap-0.5 pt-0.5">
                <h3 className={`text-[14px] font-medium transition-colors duration-200 ease-out ${isDone ? "text-fg-4" : "text-fg"}`}>{s?.title}</h3>
                {s?.detail && <p className="text-[13px] leading-relaxed text-pretty text-fg-3">{inline(s.detail)}</p>}
              </div>
            </Arrive>
          );
        })}
      </ol>
    </div>
  );
}

export const stepsText = (d: BlockProps<StepsData>["data"]) => (d.steps ?? []).map((s, i) => `${i + 1}. ${s?.title}\n   ${s?.detail ?? ""}`).join("\n");

export function StepsSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-2 py-2">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="skeleton size-6 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5 pt-1">
            <Bar className="h-3.5 w-2/5" />
            <Bar className="h-3 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}


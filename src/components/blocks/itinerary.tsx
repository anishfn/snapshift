"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { ArrowUpRightIcon } from "@/components/icons";
import type { ItineraryData } from "@/lib/blocks";
import { easeOut, glide } from "@/lib/motion";
import { Action, Arrive, Bar, BlockHeader, type BlockProps } from "./shared";

// A plan by day. Short plans list every day; longer ones get a row of day tabs (arrow keys move between them, the
// day slides the way you went). Each stop: the time in its own column, what, where (opens in Maps), a note.

export function Itinerary({ data }: BlockProps<ItineraryData>) {
  const days = (data.days ?? []).filter((d) => d?.label);
  const [tab, setTab] = useState(0);
  const id = useId();
  const [dir, setDir] = useState(1);
  const tabbed = days.length > 2;
  const go = (i: number) => {
    setDir(i > tab ? 1 : -1);
    setTab(Math.max(0, Math.min(days.length - 1, i)));
  };
  const shown = tabbed ? [days[Math.min(tab, days.length - 1)]] : days;

  return (
    <div className="flex flex-col gap-3 px-2 py-1">
      <BlockHeader title={data.title} />
      {tabbed && (
        <div role="tablist" aria-label="Days" className="no-scrollbar -mx-1 flex gap-1 overflow-x-auto px-1">
          {days.map((d, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === tab}
              tabIndex={i === tab ? 0 : -1}
              onClick={() => go(i)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") go(tab + 1);
                if (e.key === "ArrowLeft") go(tab - 1);
              }}
              className={`focus-ring relative h-8 shrink-0 rounded-[10px] px-3 text-[13px] whitespace-nowrap transition-colors duration-200 ${
                i === tab ? "text-fg" : "text-fg-4 hover:text-fg-2"
              }`}
            >
              {/* the selected day's fill slides from tab to tab */}
              {i === tab && (
                <motion.span layoutId={`${id}-day`} transition={glide} className="absolute inset-0 rounded-[10px] bg-control shadow-[inset_0_0_0_1px_var(--line)]" />
              )}
              <span className="relative font-medium">{d?.label}</span>
            </button>
          ))}
        </div>
      )}
      <div className="overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={tabbed ? tab : "all"}
            className="flex flex-col gap-5"
            initial={tabbed ? { opacity: 0, x: dir * 16 } : false}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.25, ease: easeOut } }}
            exit={{ opacity: 0, x: dir * -16, transition: { duration: 0.12, ease: easeOut } }}
          >
            {shown.map((d, di) => (
              <section key={di} className="flex flex-col gap-1">
                {!tabbed && <h4 className="text-[12px] font-medium text-fg-3">{d?.label}</h4>}
                <ol className="flex flex-col">
                  {(d?.items ?? []).map((it, i) => (
                    <Arrive as="li" key={i} className="group grid grid-cols-[4.25rem_1fr_auto] items-start gap-x-3 rounded-[8px] py-2">
                      <span className="pt-px text-[12px] text-fg-4 tabular-nums">{it?.time}</span>
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-[14px] text-fg">{it?.title}</span>
                        {(it?.place || it?.note) && (
                          <span className="text-[12px] text-pretty text-fg-4">
                            {it?.place}
                            {it?.place && it?.note && " · "}
                            {it?.note}
                          </span>
                        )}
                      </span>
                      {it?.place ? (
                        <Action
                          showLabel={false}
                          label={`Open ${it.place} in Maps`}
                          icon={<ArrowUpRightIcon size={13} />}
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(it.place)}`}
                        />
                      ) : (
                        <span />
                      )}
                    </Arrive>
                  ))}
                </ol>
              </section>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export const itineraryText = (d: BlockProps<ItineraryData>["data"]) =>
  [d.title, ...(d.days ?? []).flatMap((day) => ["", day?.label, ...(day?.items ?? []).map((i) => `${i?.time}  ${i?.title}${i?.place ? `, ${i.place}` : ""}${i?.note ? ` (${i.note})` : ""}`)])]
    .filter((x) => x !== undefined)
    .join("\n");

export function ItinerarySkeleton() {
  return (
    <div className="flex flex-col gap-3 px-2 py-1">
      <Bar className="h-3.5 w-1/3" />
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <Bar key={i} className="h-8 w-16" />
        ))}
      </div>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3">
          <Bar className="h-3 w-12" />
          <Bar className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

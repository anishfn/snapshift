"use client";

import { useState } from "react";
import { CheckIcon, XIcon } from "@/components/icons";
import type { ComparisonData } from "@/lib/blocks";
import { Arrive, ArtifactImage, Bar, type BlockProps, Lightbox } from "./shared";

// The options side by side; on a phone they become a row you swipe, each card most of the width, so they can
// still be compared rather than read as a long stack. Picked options carry a hairline ring and the Pick badge;
// the rest step back. Images open full size.

export function Comparison({ data }: BlockProps<ComparisonData>) {
  const options = data.options ?? [];
  const images = options.map((o) => o?.artifact).filter((a): a is string => !!a);
  const [open, setOpen] = useState<number | null>(null);
  const cols = options.length >= 4 ? "sm:grid-cols-4" : options.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return (
    <div className="flex flex-col gap-2">
      <div className={`no-scrollbar -mx-2 flex snap-x snap-mandatory gap-2 overflow-x-auto px-2 sm:mx-0 sm:grid sm:overflow-visible sm:px-0 ${cols}`}>
        {options.map((o, i) => {
          const picked = !!o?.picked;
          const img = o?.artifact ? images.indexOf(o.artifact) : -1;
          return (
            <Arrive
              key={i}
              className={`flex w-[78%] shrink-0 snap-start flex-col gap-3 rounded-[12px] p-1 pb-3 sm:w-auto ${picked ? "bg-white/[0.03] shadow-[inset_0_0_0_1px_var(--line-strong)]" : ""}`}
            >
              {o?.artifact ? (
                <button type="button" onClick={() => setOpen(img)} className="focus-ring overflow-hidden rounded-[8px]" aria-label={`Open ${o.title ?? "image"}`}>
                  <ArtifactImage id={o.artifact} className={`transition-[scale,opacity] duration-300 ease-out hover:scale-[1.02] ${o?.picked === false ? "opacity-60" : ""}`} />
                </button>
              ) : null}
              <div className="flex flex-col gap-1.5 px-2">
                <div className="flex items-center gap-2">
                  <h3 className={`text-[14px] font-medium ${o?.picked === false ? "text-fg-4" : "text-fg"}`}>{o?.title}</h3>
                  {picked && <Arrive className="rounded-[6px] bg-accent px-1.5 text-[11px] leading-5 font-medium text-accent-fg">Pick</Arrive>}
                </div>
                {o?.summary && <p className="text-[13px] leading-snug text-pretty text-fg-3">{o.summary}</p>}
                {!!o?.points?.length && (
                  <ul className="mt-1 flex flex-col gap-1">
                    {o.points.map((p, j) => (
                      <Arrive as="li" key={j} className="flex items-start gap-1.5 text-[13px] leading-snug">
                        {p?.good === false ? (
                          <XIcon size={14} className="mt-[2px] shrink-0 text-fg-5" aria-label="Against" />
                        ) : (
                          <CheckIcon size={14} className="mt-[2px] shrink-0 text-fg" aria-label="For" />
                        )}
                        <span className={p?.good === false ? "text-fg-4" : "text-fg-2"}>{p?.text}</span>
                      </Arrive>
                    ))}
                  </ul>
                )}
              </div>
            </Arrive>
          );
        })}
      </div>
      {data.footnote && <p className="px-2 pb-1 text-[12px] text-pretty text-fg-4">{data.footnote}</p>}
      <Lightbox ids={images} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
    </div>
  );
}

export function comparisonText(d: BlockProps<ComparisonData>["data"]) {
  return (d.options ?? [])
    .map((o) => `${o?.title}${o?.picked ? " (pick)" : ""}: ${o?.summary ?? ""}\n${(o?.points ?? []).map((p) => `  ${p?.good === false ? "-" : "+"} ${p?.text}`).join("\n")}`)
    .join("\n\n");
}

export function ComparisonSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden sm:grid sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex w-[78%] shrink-0 flex-col gap-3 p-1 pb-3 sm:w-auto">
          <div className="skeleton aspect-[40/21] rounded-[8px]" />
          <div className="flex flex-col gap-2 px-2">
            <Bar className="h-3.5 w-1/2" />
            <Bar className="h-3 w-5/6" />
            <Bar className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

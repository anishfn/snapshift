"use client";

import { useState } from "react";
import type { MatrixData } from "@/lib/blocks";
import { Arrive, Bar, type BlockProps, finite, useWidth } from "./shared";

// A 2×2: items placed on two scales, quadrant names faint in the corners, hairlines down the middle. One colour
// (identity is the label, not a hue). Labels sit beside their dot, flip left near the right edge, and step down
// when they'd overlap another. Pointing at an item lifts it above the rest.

const clamp = (v: number) => Math.max(0.04, Math.min(0.96, v));
const LABEL_H = 18;

export function Matrix({ data }: BlockProps<MatrixData>) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const height = Math.min(360, width * 0.5);
  const [hover, setHover] = useState<number | null>(null);
  const items = (data.items ?? []).filter((i) => i?.name && finite(i.x) && finite(i.y)) as { name: string; x: number; y: number }[];

  // Place labels top to bottom, nudging any that would sit on one already placed.
  const placed: { x0: number; x1: number; y: number }[] = [];
  const labels = items
    .map((it, i) => ({ i, px: clamp(it.x) * width, py: (1 - clamp(it.y)) * height, w: it.name.length * 6.6 + 12 }))
    .sort((a, b) => a.py - b.py)
    .map((l) => {
      const right = l.px > width * 0.7;
      const x0 = right ? l.px - 10 - l.w : l.px + 10;
      let y = l.py;
      for (let tries = 0; tries < 4 && placed.some((p) => Math.abs(p.y - y) < LABEL_H && x0 < p.x1 && x0 + l.w > p.x0); tries++) y += LABEL_H;
      placed.push({ x0, x1: x0 + l.w, y });
      return { ...l, right, ly: y };
    });

  const q = data.quadrants;
  const corner = "pointer-events-none absolute text-[11px] text-fg-5";
  return (
    <div className="flex flex-col gap-2 px-2 py-1">
      <div className="flex gap-2">
        {/* the vertical scale, read bottom to top */}
        <div className="flex w-4 shrink-0 flex-col items-center justify-between py-1 text-[11px] text-fg-5">
          <span className="rotate-180 [writing-mode:vertical-rl]">{data.y?.high}</span>
          <span className="rotate-180 font-medium text-fg-3 [writing-mode:vertical-rl]">{data.y?.label}</span>
          <span className="rotate-180 [writing-mode:vertical-rl]">{data.y?.low}</span>
        </div>
        <div ref={ref} className="relative flex-1 rounded-[12px] bg-surface" style={{ height: height || undefined, aspectRatio: height ? undefined : "2/1" }}>
          <span aria-hidden className="absolute inset-y-0 left-1/2 w-px bg-line" />
          <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-line" />
          {q?.top_left && <span className={`${corner} top-2 left-2.5`}>{q.top_left}</span>}
          {q?.top_right && <span className={`${corner} top-2 right-2.5`}>{q.top_right}</span>}
          {q?.bottom_left && <span className={`${corner} bottom-2 left-2.5`}>{q.bottom_left}</span>}
          {q?.bottom_right && <span className={`${corner} right-2.5 bottom-2`}>{q.bottom_right}</span>}
          {width > 0 && (
            <ul>
              {labels.map((l) => (
                <Arrive as="li" key={l.i} className={`pointer-events-none absolute inset-0 ${hover === l.i ? "z-10" : ""}`}>
                  <span
                    style={{ left: l.px, top: l.py }}
                    onPointerEnter={() => setHover(l.i)}
                    onPointerLeave={() => setHover(null)}
                    className={`pointer-events-auto absolute size-2.5 -translate-1/2 rounded-full ring-2 ring-surface transition-colors ${
                      hover === null || hover === l.i ? "bg-accent" : "bg-fg-4"
                    }`}
                  />
                  <span
                    style={{ left: l.right ? undefined : l.px + 10, right: l.right ? width - l.px + 10 : undefined, top: l.ly }}
                    onPointerEnter={() => setHover(l.i)}
                    onPointerLeave={() => setHover(null)}
                    className={`pointer-events-auto absolute -translate-y-1/2 rounded-[6px] px-1 text-[12px] whitespace-nowrap transition-colors ${
                      hover === l.i ? "bg-raised text-fg shadow-faint" : hover === null ? "text-fg-2" : "text-fg-5"
                    }`}
                  >
                    {items[l.i].name}
                  </span>
                </Arrive>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="flex justify-between ps-6 text-[11px] text-fg-5">
        <span>{data.x?.low}</span>
        <span className="font-medium text-fg-3">{data.x?.label}</span>
        <span>{data.x?.high}</span>
      </div>
    </div>
  );
}

export const matrixText = (d: BlockProps<MatrixData>["data"]) =>
  [`${d.y?.label} (up) by ${d.x?.label} (right)`, ...(d.items ?? []).map((i) => `${i?.name}: ${d.x?.label} ${Math.round((i?.x ?? 0) * 10)}/10, ${d.y?.label} ${Math.round((i?.y ?? 0) * 10)}/10`)].join("\n");

export function MatrixSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-2 py-1">
      <div className="flex gap-2">
        <div className="w-4" />
        <div className="skeleton aspect-[16/10] flex-1 rounded-[12px]" />
      </div>
      <div className="flex justify-between ps-6">
        <Bar className="h-2.5 w-10" />
        <Bar className="h-2.5 w-16" />
        <Bar className="h-2.5 w-10" />
      </div>
    </div>
  );
}

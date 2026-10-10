"use client";

import { useRef, useState } from "react";
import type { CompareData } from "@/lib/blocks";
import { Bar, type BlockProps, useArtifact } from "./shared";

// Two images of the same thing, one over the other: drag the handle (or use the arrow keys) and the "after" is
// revealed over the "before" through a clip, no second copy of anything. Images Snap picked from the conversation.

export function Compare({ data }: BlockProps<CompareData>) {
  const before = useArtifact(data.before || undefined);
  const after = useArtifact(data.after || undefined);
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const at = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (r) setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };
  if (!before?.src || !after?.src) return null;

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={box}
        className="relative cursor-ew-resize touch-pan-y overflow-hidden rounded-[12px] bg-surface outline-1 -outline-offset-1 outline-white/10 select-none"
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          at(e.clientX);
        }}
        onPointerMove={(e) => dragging.current && at(e.clientX)}
        onPointerUp={() => (dragging.current = false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- data URLs and local stills */}
        <img src={before.src} alt={data.before_label || "Before"} draggable={false} className="block w-full" />
        {/* eslint-disable-next-line @next/next/no-img-element -- data URLs and local stills */}
        <img
          src={after.src}
          alt={data.after_label || "After"}
          draggable={false}
          className="absolute inset-0 size-full object-cover"
          style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
        />
        <span className="pointer-events-none absolute top-2.5 left-2.5 rounded-[6px] bg-black/60 px-1.5 py-0.5 text-[11px] text-white">{data.before_label || "Before"}</span>
        <span className="pointer-events-none absolute top-2.5 right-2.5 rounded-[6px] bg-black/60 px-1.5 py-0.5 text-[11px] text-white">{data.after_label || "After"}</span>
        {/* the handle: a line with a grip, the actual slider for keyboards and screen readers */}
        <div className="absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.25)]" style={{ left: `${pos}%` }}>
          <div
            role="slider"
            tabIndex={0}
            aria-label="Compare"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pos)}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
              if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
            }}
            className="focus-ring absolute top-1/2 left-1/2 flex h-8 w-5 -translate-1/2 items-center justify-center gap-[3px] rounded-full bg-white shadow-popover"
          >
            <span className="h-3 w-px bg-black/40" />
            <span className="h-3 w-px bg-black/40" />
          </div>
        </div>
      </div>
      {data.note && <p className="px-2 pb-1 text-[13px] text-pretty text-fg-3">{data.note}</p>}
    </div>
  );
}

export const compareText = (d: BlockProps<CompareData>["data"]) => [`${d.before_label} vs ${d.after_label}`, d.note].filter(Boolean).join("\n");

export function CompareSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <div className="skeleton aspect-[40/21] rounded-[12px]" />
      <Bar className="ms-2 h-3 w-1/2" />
    </div>
  );
}

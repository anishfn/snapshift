"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, CopyIcon, XIcon } from "@/components/icons";
import type { Streaming } from "@/lib/blocks";
import { easeOut, glide, iconSwap, press } from "@/lib/motion";
import type { Artifact } from "@/lib/types";

/** The conversation's artifacts, so a block can show an image Snap pulled back by id. */
export const ArtifactsContext = createContext<Record<string, Artifact>>({});
export const useArtifact = (id?: string) => {
  const all = useContext(ArtifactsContext);
  return id ? all[id] : undefined;
};

/** A piece of a block arriving while the writer streams: out of a small blur, no movement. */
export function Arrive({
  children,
  className,
  as = "div",
  reorder,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "li" | "tr";
  /** Glide to a new place when the list is re-ordered (sorting), instead of jumping there. */
  reorder?: boolean;
}) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      layout={reorder ? "position" : undefined}
      initial={{ opacity: 0, filter: "blur(4px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.3, ease: easeOut, layout: glide }}
    >
      {children}
    </Tag>
  );
}

/** An artifact image at its own aspect, or the surface in its place until it exists. */
export function ArtifactImage({ id, className = "" }: { id?: string; className?: string }) {
  const a = useArtifact(id);
  if (!a?.src) return <div className={`aspect-[40/21] bg-surface ${className}`} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URLs and tiny local stills, nothing for next/image to do
    <img
      src={a.src}
      alt={a.caption ?? a.name}
      // a hairline of light round every image, so a bright picture doesn't bleed into the dark card
      className={`aspect-[40/21] w-full bg-surface object-cover outline-1 -outline-offset-1 outline-white/10 ${className}`}
    />
  );
}

/** Placeholder bars in a block's own shape. */
export const Bar = ({ className }: { className: string }) => <div className={`skeleton rounded-[6px] ${className}`} />;

/** A box's width as it lays out, for drawings that size themselves to their column. 0 until measured. */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** Chart series colours, in their fixed order. */
export const SERIES = ["var(--series-1)", "var(--series-2)", "var(--series-3)", "var(--series-4)", "var(--series-5)"];

/** What a block can do in the conversation: Options sends the answer the user taps. */
export const ChatActionsContext = createContext<{ send: (text: string) => void; busy: boolean; compose: (text: string) => void }>({
  send: () => {},
  busy: false,
  compose: () => {},
});

/** Numbers that have fully arrived: streaming JSON can leave a value half-written. */
export const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/* ---------- what every block view receives ---------- */

export type BlockProps<T> = {
  data: Streaming<T>;
  /** Finished streaming: interactions that need the whole thing (sorting, quizzes) can start. */
  settled: boolean;
  /** What the user sent next, for blocks that ask something (Options). */
  answer?: string;
  /** Saves a change the user made (a ticked item) back into the conversation. */
  onChange?: (data: unknown) => void;
};

/* ---------- small controls, one look across every block ---------- */

/** A quiet 28px action inside a block: icon, optional label, the soft wash on hover. */
export function Action({
  icon,
  label,
  onClick,
  href,
  pressed,
  showLabel = true,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  href?: string;
  pressed?: boolean;
  showLabel?: boolean;
}) {
  const className = `focus-ring flex h-7 shrink-0 items-center gap-1.5 rounded-[8px] text-[12px] transition-colors ${
    !showLabel ? "w-7 justify-center" : icon ? "ps-1.5 pe-2" : "px-2"
  } ${pressed ? "bg-control text-fg" : "text-fg-4 hover:bg-white/[0.06] hover:text-fg"}`;
  if (href) {
    return (
      <motion.a href={href} target="_blank" rel="noreferrer" whileTap={press} className={className} aria-label={showLabel ? undefined : label}>
        {icon}
        {showLabel && label}
      </motion.a>
    );
  }
  return (
    <motion.button type="button" whileTap={press} onClick={onClick} aria-pressed={pressed} aria-label={showLabel ? undefined : label} className={className}>
      {icon}
      {showLabel && label}
    </motion.button>
  );
}

/** Copies text; the icon blur-swaps to a check for a moment. */
export function CopyAction({ text, label = "Copy", showLabel = true }: { text: () => string; label?: string; showLabel?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <Action
      label={done ? "Copied" : label}
      showLabel={showLabel}
      onClick={async () => {
        await navigator.clipboard.writeText(text()).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
      icon={
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={done ? "done" : "copy"} {...iconSwap} className="flex">
            {done ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
          </motion.span>
        </AnimatePresence>
      }
    />
  );
}

/** Where a block's own tools go: the card's top bar, beside Copy, so every card keeps them in one place. */
export const ToolsSlot = createContext<HTMLElement | null>(null);

/** A view's tools (Table view, Add to calendar, Collapse all...), drawn into the card's top bar. */
export function Tools({ children }: { children: ReactNode }) {
  const slot = useContext(ToolsSlot);
  return slot ? createPortal(children, slot) : <div className="-me-1 flex items-center justify-end gap-0.5">{children}</div>;
}

/** A block's own title row in its body; any actions passed in go up to the card's top bar. */
export function BlockHeader({ title, meta, children }: { title?: ReactNode; meta?: ReactNode; children?: ReactNode }) {
  return (
    <>
      {(title || meta) && (
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
          {title && <h3 className="text-[15px] leading-snug font-medium tracking-[-0.01em] text-fg">{title}</h3>}
          {meta && <span className="text-[12px] text-fg-4 tabular-nums">{meta}</span>}
        </div>
      )}
      {children && <Tools>{children}</Tools>}
    </>
  );
}

/** "Show 6 more" under a long list, and "Show less" to fold it back. */
export function MoreToggle({ hidden, open, onToggle, noun = "" }: { hidden: number; open: boolean; onToggle: () => void; noun?: string }) {
  if (hidden <= 0) return null;
  return (
    <motion.button
      type="button"
      whileTap={press}
      onClick={onToggle}
      className="focus-ring flex h-7 w-fit items-center gap-1 rounded-[8px] ps-2 pe-1.5 text-[12px] text-fg-4 hover:bg-white/[0.06] hover:text-fg"
    >
      {open ? "Show less" : `Show ${hidden} more${noun ? ` ${noun}` : ""}`}
      <ChevronDownIcon size={14} className={`transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`} />
    </motion.button>
  );
}

/** Saves text as a file; the object URL outlives the click so the download isn't cancelled. */
export function saveFile(name: string, type: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Today as YYYY-MM-DD in the reader's time zone; "" on the server so nothing mismatches on hydration. */
const subscribeDay = (cb: () => void) => {
  const t = setInterval(cb, 60_000);
  return () => clearInterval(t);
};
const localDay = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
export const useToday = () => useSyncExternalStore(subscribeDay, localDay, () => "");

/* ---------- the image viewer ---------- */

/**
 * Full-size images over a dark wash, centred (a modal, so it scales from the centre): arrows and ←/→ move,
 * Escape, the wash or × closes, and focus returns to what opened it.
 */
export function Lightbox({ ids, index, onIndex, onClose }: { ids: string[]; index: number | null; onIndex: (i: number) => void; onClose: () => void }) {
  const all = useContext(ArtifactsContext);
  const open = index !== null;
  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onIndex(((index ?? 0) + 1) % ids.length);
      if (e.key === "ArrowLeft") onIndex(((index ?? 0) - 1 + ids.length) % ids.length);
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      back?.focus();
    };
  }, [open, index, ids.length, onClose, onIndex]);

  if (typeof document === "undefined") return null;
  const a = open ? all[ids[index]] : undefined;
  return createPortal(
    <AnimatePresence>
      {open && a?.src && (
        <motion.div
          role="dialog"
          aria-modal
          aria-label={a.name}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 sm:p-10"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.2, ease: easeOut } }}
          exit={{ opacity: 0, transition: { duration: 0.15, ease: easeOut } }}
        >
          <motion.figure
            key={a.id}
            className="flex max-h-full max-w-5xl flex-col items-center gap-3"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.22, ease: easeOut } }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- data URLs and local stills */}
            <img src={a.src} alt={a.caption ?? a.name} className="max-h-[78vh] w-auto rounded-[16px] object-contain" />
            <figcaption className="max-w-[60ch] text-center text-[13px] text-fg-3">{a.caption ?? a.name}</figcaption>
          </motion.figure>
          <div className="absolute top-4 right-4 flex gap-1" onClick={(e) => e.stopPropagation()}>
            {ids.length > 1 && (
              <>
                <Action showLabel={false} label="Previous image" icon={<ChevronLeftIcon size={16} />} onClick={() => onIndex((index - 1 + ids.length) % ids.length)} />
                <span className="flex h-7 items-center px-1 text-[12px] text-fg-4 tabular-nums">
                  {index + 1} / {ids.length}
                </span>
                <Action showLabel={false} label="Next image" icon={<ChevronRightIcon size={16} />} onClick={() => onIndex((index + 1) % ids.length)} />
              </>
            )}
            <Action showLabel={false} label="Close" icon={<XIcon size={16} />} onClick={onClose} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/**
 * A value that changes in place (a scaled amount, a count, a total): the old one blurs out as the new one blurs in,
 * in the same spot. No movement, so a column of numbers doesn't jitter.
 */
export function Swap({ value, className }: { value: ReactNode; className?: string }) {
  const key = typeof value === "string" || typeof value === "number" ? String(value) : undefined;
  return (
    // inline, so the value reads and copies as part of its sentence; the outgoing one is popped out of the flow
    <span className={`relative inline-block ${className ?? ""}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={key}
          className="inline-block"
          initial={{ opacity: 0, filter: "blur(3px)" }}
          animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 0.18, ease: easeOut } }}
          exit={{ opacity: 0, filter: "blur(3px)", transition: { duration: 0.1, ease: easeOut } }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

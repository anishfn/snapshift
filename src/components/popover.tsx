"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { easeOut } from "@/lib/motion";

/**
 * A raised popover under its trigger: 180ms in from 0.95 on the trigger's side, out faster. Escape or a click
 * outside closes it and focus goes back to the trigger.
 */
export function Popover({
  trigger,
  children,
  align = "start",
  label,
  side = "bottom",
  menu,
}: {
  /** A short list of things to do: narrower, with less padding. */
  menu?: boolean;
  /** Above the trigger, for one that sits at the bottom of the screen. */
  side?: "top" | "bottom";
  trigger: (props: { open: boolean; toggle: () => void; "aria-expanded": boolean; "aria-controls": string }) => ReactNode;
  /** Or a function given `close`, for a menu whose rows act and then get out of the way. */
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: "start" | "end";
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      root.current?.querySelector<HTMLElement>("[aria-expanded]")?.focus();
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", key);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o), "aria-expanded": open, "aria-controls": id })}
      <AnimatePresence>
        {open && (
          <motion.div
            id={id}
            role="dialog"
            aria-label={label}
            className={`absolute z-40 rounded-[16px] bg-raised shadow-popover ${menu ? "w-[15.5rem] p-1.5" : "w-[min(18rem,calc(100vw-2.5rem))] p-3"} ${side === "top" ? "bottom-full mb-2" : "top-full mt-2"} ${
              align === "end" ? `right-0 ${side === "top" ? "origin-bottom-right" : "origin-top-right"}` : `left-0 ${side === "top" ? "origin-bottom-left" : "origin-top-left"}`
            }`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1, transition: { duration: 0.18, ease: easeOut } }}
            exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.1, ease: easeOut } }}
          >
            {typeof children === "function" ? children(() => setOpen(false)) : children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** A label and its value on one line, for the small readouts inside popovers. */
export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-[13px]">
      <span className="text-fg-4">{label}</span>
      <span className="text-fg tabular-nums">{value}</span>
    </div>
  );
}

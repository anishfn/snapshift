"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { FolderIcon, PlusIcon, SidebarIcon, SparkleIcon, TrashIcon } from "@/components/icons";
import { easeOut, press } from "@/lib/motion";
import type { Summary } from "@/lib/types";
import { Mark } from "./mark";

export const SIDEBAR_WIDTH = 264;

/* ---------- the wide-screen breakpoint, read without a hydration mismatch ---------- */

const WIDE = "(min-width: 64rem)";
const subscribeWide = (cb: () => void) => {
  const mq = window.matchMedia(WIDE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
export const useWide = () =>
  useSyncExternalStore(
    subscribeWide,
    () => window.matchMedia(WIDE).matches,
    () => true,
  );

/* ---------- grouping by day; the clock is read outside render, once a minute ---------- */

const subscribeMinute = (cb: () => void) => {
  const t = setInterval(cb, 60_000);
  return () => clearInterval(t);
};
const minute = () => Math.floor(Date.now() / 60_000) * 60_000;

function groups(list: Summary[], now: number) {
  const day = new Date(now);
  day.setHours(0, 0, 0, 0);
  const today = day.getTime();
  const out: { label: string; items: Summary[] }[] = [];
  const add = (label: string, s: Summary) => {
    const g = out.find((x) => x.label === label);
    if (g) g.items.push(s);
    else out.push({ label, items: [s] });
  };
  for (const s of [...list].sort((a, b) => b.updatedAt - a.updatedAt)) {
    if (s.updatedAt >= today) add("Today", s);
    else if (s.updatedAt >= today - 86_400_000) add("Yesterday", s);
    else if (s.updatedAt >= today - 7 * 86_400_000) add("Previous 7 days", s);
    else add("Older", s);
  }
  return out;
}

/* ---------- the sidebar ---------- */

const rowFade = {
  initial: { opacity: 0, filter: "blur(4px)" },
  animate: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.25, ease: easeOut } },
  exit: { opacity: 0, filter: "blur(4px)", transition: { duration: 0.12, ease: easeOut } },
};

/**
 * History on the left, ChatGPT-style. On a wide screen it sits beside the chat and folds away; on a phone it
 * slides over the chat as a drawer. Everything in it lives in this browser.
 */
export function Sidebar({
  open,
  onClose,
  list,
  activeId,
  onSelect,
  onNew,
  onDemo,
  onCodebase,
  onDelete,
  instant,
}: {
  /** Before the page has settled (a phone's first frames are laid out wide), move without animating. */
  instant?: boolean;
  open: boolean;
  onClose: () => void;
  list: Summary[];
  activeId: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDemo: () => void;
  onCodebase: () => void;
  onDelete: (id: string) => void;
}) {
  const wide = useWide();
  const now = useSyncExternalStore(subscribeMinute, minute, () => 0);

  // On a phone the drawer closes with Escape.
  useEffect(() => {
    if (wide || !open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [wide, open, onClose]);

  const item =
    "focus-ring flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-[13px] text-fg-2 transition-colors hover:bg-white/[0.06] hover:text-fg";

  return (
    <>
      <AnimatePresence>
        {!wide && open && (
          <motion.div
            aria-hidden
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.25, ease: easeOut } }}
            exit={{ opacity: 0, transition: { duration: 0.15, ease: easeOut } }}
          />
        )}
      </AnimatePresence>
      <motion.aside
        aria-label="Conversations"
        inert={!open}
        initial={false}
        animate={{ x: open ? 0 : -SIDEBAR_WIDTH - 8 }}
        transition={instant ? { duration: 0 } : { duration: 0.3, ease: easeOut }}
        style={{ width: SIDEBAR_WIDTH }}
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar ${wide ? "" : "shadow-popover"}`}
      >
        <div className="flex h-[76px] shrink-0 items-center justify-between ps-5 pe-3">
          <span className="flex items-center gap-2 text-[15px]">
            <Mark />
            <span className="font-medium tracking-[-0.01em] text-fg">snapshift</span>
          </span>
          <motion.button
            type="button"
            whileTap={press}
            onClick={onClose}
            aria-label="Close the sidebar"
            className="focus-ring flex size-9 items-center justify-center rounded-[12px] text-fg-4 hover:bg-white/[0.06] hover:text-fg"
          >
            <SidebarIcon size={18} />
          </motion.button>
        </div>

        <div className="flex shrink-0 flex-col gap-0.5 px-3">
          <motion.button type="button" whileTap={press} onClick={onNew} className={item}>
            <PlusIcon size={16} className="text-fg-4" />
            New chat
          </motion.button>
          <motion.button type="button" whileTap={press} onClick={onDemo} className={item}>
            <SparkleIcon size={15} className="text-fg-4" />
            Demo conversation
          </motion.button>
          <motion.button type="button" whileTap={press} onClick={onCodebase} className={item}>
            <FolderIcon size={15} className="text-fg-4" />
            Codebase demo
          </motion.button>
        </div>

        <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-4" aria-label="History">
          {list.length === 0 ? (
            <p className="px-2.5 text-[12px] leading-snug text-fg-5">Your conversations show up here.</p>
          ) : (
            groups(list, now).map((g) => (
              <section key={g.label} className="mb-4 flex flex-col gap-0.5">
                <h2 className="px-2.5 pb-1 text-[12px] text-fg-5">{g.label}</h2>
                <ul className="flex flex-col gap-0.5">
                  <AnimatePresence initial={false}>
                    {g.items.map((s) => {
                      const active = s.id === activeId;
                      return (
                        <motion.li key={s.id} {...rowFade} className="group relative">
                          <button
                            type="button"
                            onClick={() => onSelect(s.id)}
                            aria-current={active ? "page" : undefined}
                            className={`focus-ring flex h-9 w-full items-center rounded-[10px] ps-2.5 pe-9 text-start text-[13px] transition-colors ${
                              active ? "bg-control text-fg" : "text-fg-3 hover:bg-white/[0.05] hover:text-fg"
                            }`}
                          >
                            <span className="truncate">{s.title}</span>
                          </button>
                          <motion.button
                            type="button"
                            whileTap={press}
                            onClick={() => onDelete(s.id)}
                            aria-label={`Delete ${s.title}`}
                            className="focus-ring absolute end-1.5 top-1.5 flex size-6 items-center justify-center rounded-[6px] text-fg-5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/[0.08] hover:text-fg focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                          >
                            <TrashIcon size={14} />
                          </motion.button>
                        </motion.li>
                      );
                    })}
                  </AnimatePresence>
                </ul>
              </section>
            ))
          )}
        </nav>

        <div className="flex shrink-0 flex-col items-start gap-1 px-5 pb-4 text-[12px] text-fg-5">
          <Link href="/components" className="focus-ring -mx-1 rounded-[6px] px-1 hover:text-fg-2">
            What Snap chooses from
          </Link>
          <p>Kept in this browser only.</p>
        </div>
      </motion.aside>
    </>
  );
}

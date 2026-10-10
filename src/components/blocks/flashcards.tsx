"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { CheckIcon, RotateIcon } from "@/components/icons";
import type { FlashcardsData } from "@/lib/blocks";
import { easeOut, press } from "@/lib/motion";
import { Action, Bar, BlockHeader, type BlockProps, Swap, Tools } from "./shared";

// Cards to learn from: tap (or Space) to flip, then say whether you knew it. Known cards drop out; the rest come
// round again until the pile is empty. ←/→ move without marking. Shuffle in the top bar.

type Card = { front: string; back: string };

export function Flashcards({ data, settled }: BlockProps<FlashcardsData>) {
  const cards = (data.cards ?? []).filter((c): c is Card => !!c?.front && !!c?.back);
  const [order, setOrder] = useState<number[] | null>(null);
  const [at, setAt] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Set<number>>(new Set());
  const [dir, setDir] = useState(1);

  const pile = (order ?? cards.map((_, i) => i)).filter((i) => !known.has(i));
  const current = pile[Math.min(at, pile.length - 1)];
  const card = current !== undefined ? cards[current] : undefined;
  const done = settled && cards.length > 0 && pile.length === 0;

  const move = (step: number) => {
    setDir(step);
    setFlipped(false);
    setAt((a) => (pile.length ? (a + step + pile.length) % pile.length : 0));
  };
  const mark = (knewIt: boolean) => {
    setDir(1);
    setFlipped(false);
    if (knewIt && current !== undefined) {
      setKnown((k) => new Set(k).add(current));
      setAt((a) => (a >= pile.length - 1 ? 0 : a));
    } else move(1);
  };
  const shuffle = () => {
    const next = cards.map((_, i) => i);
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    setOrder(next);
    setAt(0);
    setFlipped(false);
  };
  const restart = () => {
    setKnown(new Set());
    setAt(0);
    setFlipped(false);
  };

  return (
    <div
      className="flex flex-col gap-3 px-2 py-1 outline-none"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (done || !settled) return;
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          setFlipped((f) => !f);
        }
        if (e.key === "ArrowRight") move(1);
        if (e.key === "ArrowLeft") move(-1);
      }}
    >
      <BlockHeader title={data.title} meta={settled && cards.length > 0 ? <Swap value={`${known.size} of ${cards.length} known`} /> : undefined} />
      {settled && cards.length > 1 && (
        <Tools>
          <Action label="Shuffle" icon={null} onClick={shuffle} />
        </Tools>
      )}
      <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className="h-full origin-left rounded-full bg-accent"
          initial={false}
          animate={{ scaleX: cards.length ? known.size / cards.length : 0 }}
          transition={{ duration: 0.35, ease: easeOut }}
        />
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        {done ? (
          <motion.div
            key="done"
            className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-[14px] bg-surface p-6 text-center"
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 0.25, ease: easeOut } }}
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-accent text-accent-fg">
              <CheckIcon size={18} />
            </span>
            <p className="text-[16px] font-medium text-fg">All {cards.length} known.</p>
            <Action label="Go again" icon={<RotateIcon size={13} />} onClick={restart} />
          </motion.div>
        ) : (
          <motion.div
            key={`${current}-${known.size}`}
            initial={{ opacity: 0, x: dir * 24, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.25, ease: easeOut } }}
            exit={{ opacity: 0, x: dir * -24, filter: "blur(4px)", transition: { duration: 0.14, ease: easeOut } }}
            className="[perspective:1200px]"
          >
            {/* the card turns over on its vertical axis; each face is hidden from behind */}
            <motion.button
              type="button"
              disabled={!settled}
              onClick={() => setFlipped((f) => !f)}
              aria-label={flipped ? `Answer: ${card?.back}. Tap to see the question.` : `${card?.front}. Tap to see the answer.`}
              className="focus-ring relative grid min-h-[200px] w-full rounded-[14px] [transform-style:preserve-3d]"
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.1 }}
            >
              <span className="col-start-1 row-start-1 flex flex-col items-center justify-center gap-2 rounded-[14px] bg-surface p-6 text-center shadow-[inset_0_0_0_1px_var(--line)] [backface-visibility:hidden]">
                <span className="text-[11px] tracking-wide text-fg-5 uppercase">Question</span>
                <span className="text-[20px] leading-snug font-medium text-balance text-fg">{card?.front}</span>
                <span className="mt-2 text-[12px] text-fg-5">Tap or press Space to flip</span>
              </span>
              <span className="col-start-1 row-start-1 flex flex-col items-center justify-center gap-2 rounded-[14px] bg-control p-6 text-center shadow-[inset_0_0_0_1px_var(--line-strong)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <span className="text-[11px] tracking-wide text-fg-5 uppercase">Answer</span>
                <span className="text-[17px] leading-relaxed text-pretty text-fg-2">{card?.back}</span>
              </span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {!done && settled && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12px] text-fg-5 tabular-nums">
            <Swap value={pile.length} /> left
          </span>
          <AnimatePresence mode="popLayout" initial={false}>
            {flipped ? (
              <motion.div
                key="mark"
                className="flex gap-1.5"
                initial={{ opacity: 0, filter: "blur(4px)" }}
                animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 0.18 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
              >
                <motion.button type="button" whileTap={press} onClick={() => mark(false)} className="focus-ring h-8 rounded-[10px] bg-control px-3 text-[13px] text-fg hover:bg-control-hover">
                  Again
                </motion.button>
                <motion.button type="button" whileTap={press} onClick={() => mark(true)} className="focus-ring h-8 rounded-[10px] bg-accent px-3 text-[13px] font-medium text-accent-fg">
                  Got it
                </motion.button>
              </motion.div>
            ) : (
              <motion.span
                key="hint"
                className="text-[12px] text-fg-5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { duration: 0.18 } }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
              >
                Flip it, then say if you knew it
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export const flashcardsText = (d: BlockProps<FlashcardsData>["data"]) => [d.title, ...(d.cards ?? []).map((c) => `${c?.front}: ${c?.back}`)].filter(Boolean).join("\n");

export function FlashcardsSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-2 py-1">
      <Bar className="h-3.5 w-1/3" />
      <Bar className="h-1 w-full" />
      <div className="skeleton h-[200px] rounded-[14px]" />
    </div>
  );
}

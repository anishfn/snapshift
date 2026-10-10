"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { CheckIcon, RotateIcon, XIcon } from "@/components/icons";
import type { QuizData } from "@/lib/blocks";
import { easeOut, iconSwap, press } from "@/lib/motion";
import { Action, Bar, BlockHeader, type BlockProps } from "./shared";

// One question at a time. Pick an answer and it's marked straight away (right in the accent, a wrong pick crossed
// out, the right one shown) with the reason under it; Next moves on. At the end, the score and each question to
// look back at. Number keys pick, Enter goes on. Answers are saved with the conversation.

type QuizState = QuizData & { picks?: (number | null)[] };

const slide = {
  initial: { opacity: 0, x: 16, filter: "blur(4px)" },
  animate: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.25, ease: easeOut } },
  exit: { opacity: 0, x: -16, filter: "blur(4px)", transition: { duration: 0.12, ease: easeOut } },
};

export function Quiz({ data, settled, onChange }: BlockProps<QuizState>) {
  const questions = (data.questions ?? []).filter((q) => q?.question && (q.choices?.length ?? 0) > 1);
  const picks = questions.map((_, i) => (typeof data.picks?.[i] === "number" ? (data.picks[i] as number) : null));
  // Where the reader is: picked up from saved answers once, then moved only by them (Next, Try again, a review
  // link). Deriving it from "the first unanswered question" skipped past the explanation the moment you answered.
  const [at, setAt] = useState<number | null>(null);
  const firstOpen = picks.findIndex((p) => p === null);
  const index = at ?? (firstOpen === -1 ? questions.length : firstOpen);
  const done = index >= questions.length;
  const score = picks.filter((p, i) => p !== null && p === questions[i]?.answer).length;

  const save = (next: (number | null)[]) => onChange?.({ ...data, picks: next });
  const pick = (c: number) => {
    if (!settled || picks[index] !== null) return;
    const next = [...picks];
    next[index] = c;
    setAt(index); // stay on this question to show why
    save(next);
  };
  const restart = () => {
    save(questions.map(() => null));
    setAt(0);
  };

  if (!settled) {
    return (
      <div className="flex flex-col gap-2 px-2 py-1">
        <BlockHeader title={data.title} meta={`${questions.length} questions`} />
        <QuizSkeleton bare />
      </div>
    );
  }

  const q = questions[index];
  const picked = picks[index];
  return (
    <div
      className="flex flex-col gap-3 px-2 py-1 outline-none"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (done) return;
        const n = Number(e.key);
        if (n >= 1 && n <= (q?.choices?.length ?? 0)) pick(n - 1);
        if (e.key === "Enter" && picked !== null) setAt(index + 1);
      }}
    >
      <BlockHeader title={data.title} meta={done ? `${score} of ${questions.length}` : `${index + 1} of ${questions.length}`}>
        {done && <Action label="Try again" icon={<RotateIcon size={13} />} onClick={restart} />}
      </BlockHeader>
      {/* one dot per question: answered right, answered wrong, current, still to come */}
      <div className="flex gap-1" aria-hidden>
        {questions.map((qq, i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              picks[i] === null ? (i === index ? "bg-fg-4" : "bg-white/[0.08]") : picks[i] === qq?.answer ? "bg-accent" : "bg-bad/70"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        {done ? (
          <motion.div key="done" {...slide} className="flex flex-col gap-3">
            <p className="text-[22px] leading-tight font-medium tracking-[-0.02em] text-fg">
              {score} of {questions.length} right
              <span className="ms-2 text-[14px] font-normal text-fg-4">
                {score === questions.length ? "All of them." : score >= questions.length * 0.7 ? "Good going." : "Worth another go."}
              </span>
            </p>
            <ol className="flex flex-col gap-1">
              {questions.map((qq, i) => {
                const right = picks[i] === qq?.answer;
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => setAt(i)}
                      className="focus-ring flex w-full items-start gap-2 rounded-[8px] px-1.5 py-1 text-start text-[13px] hover:bg-white/[0.04]"
                    >
                      {right ? <CheckIcon size={14} className="mt-0.5 shrink-0 text-good" aria-label="Right" /> : <XIcon size={14} className="mt-0.5 shrink-0 text-bad" aria-label="Wrong" />}
                      <span className="text-fg-2">{qq?.question}</span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </motion.div>
        ) : (
          <motion.div key={index} {...slide} className="flex flex-col gap-3">
            <p className="text-[16px] leading-snug font-medium text-pretty text-fg">{q?.question}</p>
            <ul className="flex flex-col gap-1.5">
              {(q?.choices ?? []).map((c, ci) => {
                const answered = picked !== null;
                const isRight = ci === q?.answer;
                const isPicked = ci === picked;
                const state = !answered ? "idle" : isRight ? "right" : isPicked ? "wrong" : "other";
                return (
                  <li key={ci}>
                    <motion.button
                      type="button"
                      disabled={answered}
                      onClick={() => pick(ci)}
                      className={`focus-ring flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-start text-[14px] transition-[background-color,box-shadow,opacity,color] duration-200 ease-out enabled:active:bg-control ${
                        state === "idle"
                          ? "bg-surface hover:bg-surface-hover"
                          : state === "right"
                            ? "bg-control text-fg shadow-[inset_0_0_0_1px_var(--line-strong)]"
                            : state === "wrong"
                              ? "bg-surface text-fg-4 line-through decoration-fg-6"
                              : "bg-surface opacity-45"
                      }`}
                    >
                      <span
                        className={`flex size-6 shrink-0 items-center justify-center rounded-[7px] text-[12px] font-medium transition-colors duration-200 ease-out ${
                          state === "right" ? "bg-accent text-accent-fg" : "bg-white/[0.06] text-fg-3"
                        }`}
                      >
                        {/* the letter turns into the verdict with the icon swap: scale and blur, no jump */}
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span key={state === "right" || state === "wrong" ? state : "letter"} {...iconSwap} className="flex">
                            {state === "right" ? <CheckIcon size={13} /> : state === "wrong" ? <XIcon size={13} /> : String.fromCharCode(65 + ci)}
                          </motion.span>
                        </AnimatePresence>
                      </span>
                      <span className="text-fg-2">{c}</span>
                    </motion.button>
                  </li>
                );
              })}
            </ul>
            <AnimatePresence>
              {picked !== null && (
                <motion.div
                  className="flex flex-col gap-3"
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 0.22, ease: easeOut } }}
                >
                  <p className="text-[13px] leading-relaxed text-pretty text-fg-3">
                    <span className="text-fg">{picked === q?.answer ? "Right. " : "Not quite. "}</span>
                    {q?.explain}
                  </p>
                  <motion.button
                    type="button"
                    whileTap={press}
                    onClick={() => setAt(index + 1)}
                    className="focus-ring h-8 w-fit rounded-[10px] bg-accent px-3 text-[13px] font-medium text-accent-fg"
                  >
                    {index === questions.length - 1 ? "See score" : "Next"}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const quizText = (d: BlockProps<QuizData>["data"]) =>
  (d.questions ?? [])
    .map((q, i) => `${i + 1}. ${q?.question}\n${(q?.choices ?? []).map((c, j) => `   ${String.fromCharCode(65 + j)}) ${c}`).join("\n")}\n   Answer: ${String.fromCharCode(65 + (q?.answer ?? 0))}`)
    .join("\n\n");

export function QuizSkeleton({ bare }: { bare?: boolean }) {
  return (
    <div className={`flex flex-col gap-3 ${bare ? "" : "px-2 py-1"}`}>
      {!bare && <Bar className="h-3.5 w-1/3" />}
      <Bar className="h-1 w-full" />
      <Bar className="h-4 w-3/4" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="skeleton h-11 rounded-[12px]" />
      ))}
    </div>
  );
}

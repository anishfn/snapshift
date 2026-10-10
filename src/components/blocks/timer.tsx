"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon, RotateIcon } from "@/components/icons";
import type { TimerData } from "@/lib/blocks";
import { easeOut, iconSwap, press } from "@/lib/motion";
import { Action, Bar, BlockHeader, type BlockProps, finite, Swap, Tools } from "./shared";

// A countdown you can run in the reply: one phase, or a sequence (focus and rest, steep then rest) for some rounds.
// The time is kept against the clock, not counted in ticks, so it stays right in a background tab. The ring empties
// as the phase runs. No sound (the house has none); the end is shown, not heard.

type Phase = { label: string; seconds: number };

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
};

export function Timer({ data, settled }: BlockProps<TimerData>) {
  const phases = (data.phases ?? []).filter((p): p is Phase => !!p?.label && finite(p.seconds) && p.seconds > 0);
  const rounds = Math.max(1, finite(data.rounds) ? data.rounds : 1);
  const [step, setStep] = useState(0); // index across all rounds
  const [left, setLeft] = useState<number | null>(null); // ms left in this phase
  const [running, setRunning] = useState(false);
  const end = useRef(0);
  // the interval reads the step from here, so it never has to set state inside another state update
  const stepRef = useRef(0);
  useEffect(() => {
    stepRef.current = step;
  }, [step]);
  const total = phases.length * rounds;
  const finished = step >= total;
  const phase = phases[step % Math.max(1, phases.length)];
  const length = (phase?.seconds ?? 0) * 1000;
  const remaining = left ?? length;

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const ms = end.current - Date.now();
      if (ms > 0) return setLeft(ms);
      // phase over: on to the next, keeping time continuous
      const next = stepRef.current + 1;
      stepRef.current = next;
      setStep(next);
      if (next >= total) {
        setRunning(false);
        setLeft(0);
      } else {
        const nextLen = phases[next % phases.length].seconds * 1000;
        end.current = Date.now() + nextLen + ms;
        setLeft(nextLen + ms);
      }
    }, 200);
    return () => clearInterval(t);
  }, [running, total, phases]);

  const toggle = () => {
    if (finished) return;
    if (running) {
      setLeft(end.current - Date.now());
      setRunning(false);
    } else {
      end.current = Date.now() + remaining;
      setRunning(true);
    }
  };
  const reset = () => {
    setRunning(false);
    setStep(0);
    setLeft(null);
  };
  const skip = () => {
    const next = step + 1;
    setStep(next);
    if (next >= total) {
      setRunning(false);
      setLeft(0);
    } else {
      const len = phases[next % phases.length].seconds * 1000;
      setLeft(len);
      end.current = Date.now() + len;
    }
  };

  const R = 58;
  const C = 2 * Math.PI * R;
  const fraction = finished ? 0 : length ? remaining / length : 0;
  const round = Math.floor(Math.min(step, total - 1) / Math.max(1, phases.length)) + 1;

  return (
    <div className="flex flex-col gap-4 px-2 py-1">
      <BlockHeader title={data.title} />
      <Tools>
        <Action label="Reset" icon={<RotateIcon size={13} />} onClick={reset} />
      </Tools>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
        <div className="relative size-[140px] shrink-0">
          <svg viewBox="0 0 140 140" className="size-full -rotate-90" aria-hidden>
            <circle cx="70" cy="70" r={R} fill="none" stroke="var(--line)" strokeWidth={6} />
            <circle
              cx="70"
              cy="70"
              r={R}
              fill="none"
              stroke="var(--accent)"
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - fraction)}
              className="transition-[stroke-dashoffset] duration-200 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center" aria-live="off">
            <span className="text-[28px] leading-none font-medium tracking-[-0.02em] text-fg tabular-nums">{finished ? "Done" : clock(remaining)}</span>
            <Swap value={finished ? "all phases" : phase?.label ?? ""} className="mt-1.5 text-[12px] text-fg-4" />
          </div>
        </div>
        <div className="flex w-full min-w-0 flex-col gap-3">
          <div className="flex items-center gap-2">
            <motion.button
              type="button"
              whileTap={settled && !finished ? press : undefined}
              disabled={!settled || finished}
              onClick={toggle}
              className="focus-ring flex h-9 items-center gap-1.5 rounded-[12px] bg-accent ps-3 pe-3.5 text-[13px] font-medium text-accent-fg disabled:bg-control disabled:text-fg-5"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={running ? "pause" : "play"} {...iconSwap} className="flex">
                  {running ? <PauseIcon size={15} /> : <PlayIcon size={15} />}
                </motion.span>
              </AnimatePresence>
              <Swap value={running ? "Pause" : left !== null && !finished && left < length ? "Resume" : "Start"} />
            </motion.button>
            {phases.length > 1 && !finished && <Action label="Skip phase" icon={null} onClick={skip} />}
            {rounds > 1 && (
              <span className="ms-auto text-[12px] text-fg-4 tabular-nums">
                Round <Swap value={round} /> of {rounds}
              </span>
            )}
          </div>
          {phases.length > 1 && (
            <ol className="flex flex-col gap-1">
              {phases.map((p, i) => {
                const now = !finished && step % phases.length === i;
                return (
                  <li
                    key={i}
                    className={`flex items-center justify-between gap-3 rounded-[8px] px-2.5 py-1.5 text-[13px] transition-colors duration-200 ${now ? "bg-control text-fg" : "text-fg-3"}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`size-1.5 rounded-full transition-colors duration-200 ${now ? "bg-accent" : "bg-fg-6"}`} />
                      {p.label}
                    </span>
                    <span className="text-fg-4 tabular-nums">{clock(p.seconds * 1000)}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
      <AnimatePresence>
        {finished && (
          <motion.p
            className="text-center text-[13px] text-fg-3 sm:text-start"
            initial={{ opacity: 0, filter: "blur(4px)" }}
            animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 0.25, ease: easeOut } }}
          >
            Time&apos;s up{rounds > 1 ? `, all ${rounds} rounds done` : ""}.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

export const timerText = (d: BlockProps<TimerData>["data"]) =>
  [d.title, ...(d.phases ?? []).map((p) => `${p?.label}: ${clock((p?.seconds ?? 0) * 1000)}`), (d.rounds ?? 1) > 1 ? `${d.rounds} rounds` : ""]
    .filter(Boolean)
    .join("\n");

export function TimerSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-2 py-1">
      <Bar className="h-3.5 w-1/3" />
      <div className="flex items-center gap-8">
        <div className="skeleton size-[140px] rounded-full" />
        <div className="flex flex-1 flex-col gap-3">
          <Bar className="h-9 w-28" />
          <Bar className="h-3 w-2/3" />
          <Bar className="h-3 w-1/2" />
        </div>
      </div>
    </div>
  );
}

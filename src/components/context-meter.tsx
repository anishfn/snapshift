"use client";

import { motion } from "motion/react";
import { easeOut, press } from "@/lib/motion";
import type { Conversation } from "@/lib/types";
import { Popover, Row } from "./popover";

/** Snap's context window as the brief gives it. One place, so it's easy to change. */
export const CONTEXT_BUDGET = 384_000;

const short = (n: number) => (n >= 1000 ? `${n >= 100_000 ? Math.round(n / 1000) : (n / 1000).toFixed(1)}k` : `${n}`);
const secs = (ms?: number) => (ms == null ? "not yet" : ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);

/**
 * How much Snap is holding: its own measured input from the last turn, or an estimate before the first.
 * Nothing is trimmed, so the number only grows.
 */
export function ContextMeter({ conv, tokens, measured }: { conv: Conversation; tokens: number; measured: boolean }) {
  const fill = Math.min(1, tokens / CONTEXT_BUDGET);
  const used = new Set(conv.messages.flatMap((m) => m.artifacts ?? []));
  const held = [...used].map((id) => conv.artifacts[id]).filter(Boolean);
  const last = [...conv.messages].reverse().find((m) => m.turn?.decision);

  return (
    <Popover
      align="end"
      label="Context"
      trigger={({ toggle, ...aria }) => (
        <motion.button
          type="button"
          onClick={toggle}
          whileTap={press}
          {...aria}
          className="focus-ring flex h-9 items-center gap-2.5 rounded-[12px] bg-control px-3 text-[13px] text-fg-3 tabular-nums hover:bg-control-hover"
        >
          <span className="hidden h-1 w-10 overflow-hidden rounded-full bg-white/[0.1] sm:block">
            <motion.span
              className="block h-full origin-left rounded-full bg-accent"
              initial={false}
              animate={{ scaleX: Math.max(fill, tokens ? 0.02 : 0) }}
              transition={{ duration: 0.5, ease: easeOut }}
            />
          </span>
          <span>
            <span className="text-fg">
              {measured ? "" : "~"}
              {short(tokens)}
            </span>
            <span className="text-fg-5"> / {short(CONTEXT_BUDGET)}</span>
          </span>
        </motion.button>
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Row label="In context" value={`${measured ? "" : "about "}${tokens.toLocaleString("en")} tokens`} />
          <Row label="Messages" value={conv.messages.length} />
          <Row label="Images" value={held.filter((a) => a.kind === "image").length} />
          <Row label="Documents" value={held.filter((a) => a.kind === "doc").length} />
          <Row label="Last decision" value={secs(last?.turn?.decision?.ms)} />
          <Row label="Last reply written in" value={secs(last?.turn?.writeMs)} />
        </div>
        <p className="border-t border-line pt-3 text-[12px] leading-snug text-pretty text-fg-4">
          Nothing is summarized or dropped. Snap reads the whole conversation, every document and the images that matter, every turn.
          {measured ? " Measured by Snap on the last turn." : " An estimate until Snap measures the first turn."}
        </p>
      </div>
    </Popover>
  );
}

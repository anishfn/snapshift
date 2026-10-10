"use client";

import { AnimatePresence, motion } from "motion/react";
import { useContext } from "react";
import { BoltIcon, NoteIcon, QuoteIcon } from "@/components/icons";
import { blockIds, blocks } from "@/lib/blocks";
import { easeOut, iconSwap, press } from "@/lib/motion";
import type { Decision } from "@/lib/types";
import { ArtifactsContext } from "./blocks/shared";
import { Popover, Row } from "./popover";
import { DocViewerContext } from "./viewer/doc-panel";

const DEPTHS = ["One line", "Short", "Detailed", "Thorough"];
const pct = (n: number) => `${Math.round(n * 100)}%`;
const short = (n: number) => (n >= 1000 ? `${n >= 100_000 ? Math.round(n / 1000) : (n / 1000).toFixed(1)}k` : `${n}`);
const base = (name: string) => name.split("/").pop() ?? name;
const secs = (ms: number) => (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);
/**
 * What the decision cost, from the tokens Snap reports and its list price: $0.09 per million input tokens, output
 * free. In dollars ("use $", not the cent sign): 171k tokens is $0.015, a short turn $0.0002. Cached input is
 * cheaper, so this is the most it can have cost.
 */
const USD_PER_MILLION = 0.09;
const cost = (tokens: number) => {
  const usd = (tokens * USD_PER_MILLION) / 1_000_000;
  return usd < 0.00005 ? "under $0.0001" : `$${usd.toFixed(usd < 0.01 ? 4 : 3)}`;
};

/** How sure Snap was: of its one component, or of the set when the reply shows several (their shares add up). */
const sureness = (d: Decision) =>
  d.extras?.length ? Math.min(1, [d.component, ...d.extras].reduce((sum, id) => sum + (d.probabilities[id] ?? 0), 0)) : d.confidence;

const swap = {
  initial: { opacity: 0, filter: "blur(4px)" },
  animate: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.25, ease: easeOut } },
  exit: { opacity: 0, filter: "blur(4px)", transition: { duration: 0.12, ease: easeOut } },
};

/**
 * What Snap decided, above the reply: the component, how sure, how fast, and the earlier message it went back
 * to. Open it for the whole distribution: every component Snap weighed, not only the winner.
 */
export function DecisionLine({
  decision,
  recallNumber,
  onRecall,
  writer,
  writeMs,
}: {
  /** The model that wrote the reply and how long it took, credited in the breakdown. */
  writer?: string;
  writeMs?: number;
  decision?: Decision;
  recallNumber?: number;
  onRecall: () => void;
}) {
  const artifacts = useContext(ArtifactsContext);
  const viewer = useContext(DocViewerContext);
  // the documents Snap picked out of everything shared: the ones the writer was given
  const docs = (decision?.artifacts ?? []).map((id) => artifacts[id]).filter((a) => a?.kind === "doc");
  return (
    <div className="relative z-20 flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1">
      <AnimatePresence mode="popLayout" initial={false}>
        {decision ? (
          <motion.div key="decided" {...swap} className="flex items-center gap-2">
            <Popover
              label="How Snap decided"
              trigger={({ toggle, ...aria }) => (
                <motion.button
                  type="button"
                  onClick={toggle}
                  whileTap={press}
                  {...aria}
                  className="focus-ring -mx-1.5 flex h-6 items-center gap-1.5 rounded-[6px] px-1.5 text-[12px] text-fg-4 tabular-nums hover:bg-white/[0.05]"
                >
                  <motion.span {...iconSwap} className="flex">
                    <BoltIcon size={14} className="text-fg" />
                  </motion.span>
                  <span className="font-medium text-fg">Snap</span>
                  <span aria-hidden className="text-fg-6">·</span>
                  <span>{[decision.component, ...(decision.extras ?? [])].map((id) => blocks[id].label).join(" + ")}</span>
                  <span aria-hidden className="text-fg-6">·</span>
                  <span>{pct(sureness(decision))}</span>
                  <span aria-hidden className="text-fg-6">·</span>
                  <span>{secs(decision.ms)}</span>
                  <span aria-hidden className="text-fg-6">·</span>
                  <span>{short(decision.inputTokens)} tokens read</span>
                  <span aria-hidden className="text-fg-6">·</span>
                  <span>{cost(decision.inputTokens)}</span>
                </motion.button>
              )}
            >
              <Breakdown decision={decision} recallNumber={recallNumber} writer={writer} writeMs={writeMs} />
            </Popover>
            {recallNumber != null && (
              <motion.button
                type="button"
                onClick={onRecall}
                whileTap={press}
                className="focus-ring flex h-6 items-center gap-1 rounded-[6px] bg-control px-2 text-[12px] text-fg-3 tabular-nums hover:bg-control-hover"
              >
                <QuoteIcon size={13} />
                From message {recallNumber}
              </motion.button>
            )}
            {docs.length > 0 && (
              <motion.button
                type="button"
                onClick={() => viewer.open(docs[0].id)}
                whileTap={press}
                title={docs.map((d) => d.name).join(", ")}
                className="focus-ring flex h-6 max-w-[14rem] items-center gap-1 rounded-[6px] bg-control px-2 text-[12px] text-fg-3 tabular-nums hover:bg-control-hover"
              >
                <NoteIcon size={13} className="shrink-0" />
                <span className="truncate">{docs.length === 1 ? base(docs[0].name) : `${docs.length} files`}</span>
              </motion.button>
            )}
          </motion.div>
        ) : (
          <motion.div key="deciding" {...swap} className="flex h-6 items-center gap-1.5 text-[12px] text-fg-4" role="status">
            <BoltIcon size={14} className="animate-pulse text-fg-5 motion-reduce:animate-none" />
            Snap is deciding
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Breakdown({ decision, recallNumber, writer, writeMs }: { decision: Decision; recallNumber?: number; writer?: string; writeMs?: number }) {
  const artifacts = useContext(ArtifactsContext);
  const shared = Object.keys(artifacts).length;
  const ranked = [...blockIds].sort((a, b) => (decision.probabilities[b] ?? 0) - (decision.probabilities[a] ?? 0));
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-[12px] text-fg-4">Components Snap weighed</span>
        {ranked.map((id) => {
          const p = decision.probabilities[id] ?? 0;
          const chosen = id === decision.component;
          return (
            <div key={id} className="grid grid-cols-[5.5rem_1fr_2.5rem] items-center gap-2 text-[12px] tabular-nums">
              <span className={chosen ? "font-medium text-fg" : "text-fg-3"}>{blocks[id].label}</span>
              <div className="h-1 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className={`h-full origin-left rounded-full ${chosen ? "bg-accent" : "bg-fg-5"}`}
                  style={{ transform: `scaleX(${p})` }}
                />
              </div>
              <span className="text-end text-fg-4">{pct(p)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-col gap-1 border-t border-line pt-3">
        {decision.extras?.length ? (
          <Row label="Also showing" value={decision.extras.map((id) => `${blocks[id].label} ${pct(decision.extraProbabilities?.[id] ?? 0)}`).join(", ")} />
        ) : null}
        <Row label="Went back to" value={recallNumber != null ? `message ${recallNumber}, ${pct(decision.recallConfidence)}` : "nothing earlier"} />
        <Row
          label={shared > 12 ? `Picked from ${shared} files` : "From context"}
          value={decision.artifacts.length ? decision.artifacts.map((id) => (artifacts[id] ? base(artifacts[id].name) : id)).join(", ") : "none"}
        />
        <Row label="Length" value={DEPTHS[decision.depth] ?? DEPTHS[1]} />
        <Row label="Images looked at" value={decision.images} />
        <Row label="Read" value={`${decision.inputTokens.toLocaleString("en")} tokens`} />
        <Row label="Decided in" value={secs(decision.ms)} />
        <Row label="Cost" value={`${cost(decision.inputTokens)}, at $${USD_PER_MILLION} per million tokens`} />
        {writer && <Row label="Written by" value={`${writer}${writeMs ? `, ${secs(writeMs)}` : ""}`} />}
      </div>
    </div>
  );
}

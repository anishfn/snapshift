"use client";

import { AnimatePresence, motion } from "motion/react";
import { memo, useContext, useState } from "react";
import { BranchIcon, ChevronDownIcon, GlobeIcon, NoteIcon, RotateIcon } from "@/components/icons";
import { easeOut, press, rowPress } from "@/lib/motion";
import { tokensOf } from "@/lib/sources";
import { blocks } from "@/lib/blocks";
import type { Artifact, Message } from "@/lib/types";
import { Block, blockReady, blockText } from "./blocks";
import { Action, CopyAction, Lightbox, MoreToggle } from "./blocks/shared";
import { DocViewerContext } from "./viewer/doc-panel";
import { docKind } from "./viewer/text-view";
import { DecisionLine } from "./decision-line";
import { Prose } from "./prose";

/** More files than this in one message and all but the first few fold away. */
const MANY = 9;
const FEW = 6;

const DOC_LABEL: Record<string, string> = {
  pdf: "PDF",
  markdown: "Markdown",
  csv: "CSV",
  tsv: "TSV",
  json: "JSON",
  xml: "XML",
  text: "Text",
};

/**
 * A document in a message: opens in the panel on the right. Every chip is the same width, so several of them line
 * up as a grid instead of a ragged pile, and a file from a folder leads with its own name (the part that tells
 * files apart) with the folder underneath, where a long path can be cut short without hiding it.
 */
function DocChip({ a }: { a: Artifact }) {
  const viewer = useContext(DocViewerContext);
  const slash = a.name.lastIndexOf("/");
  const kind = DOC_LABEL[docKind(a.mediaType, a.name)] ?? "Document";
  return (
    <button
      type="button"
      onClick={() => viewer.open(a.id)}
      aria-label={`Open ${a.name}`}
      title={a.name}
      className={`focus-ring flex h-12 w-[13.5rem] max-w-full items-center gap-2.5 rounded-[12px] bg-control p-1.5 pe-3 text-start transition-[background-color,box-shadow] duration-200 hover:bg-control-hover ${
        viewer.openId === a.id ? "shadow-[inset_0_0_0_1px_var(--line-strong)]" : ""
      }`}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-raised text-fg-4">
        <NoteIcon size={16} />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-[13px] text-fg">{slash < 0 ? a.name : a.name.slice(slash + 1)}</span>
        <span className="truncate text-[11px] text-fg-5">{slash < 0 ? kind : a.name.slice(0, slash)}</span>
      </span>
    </button>
  );
}

const short = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k` : `${n}`);

/** A repository in a message: one chip saying what and how much, its files folded underneath. */
function SourceFiles({ artifacts }: { artifacts: Artifact[] }) {
  const [open, setOpen] = useState(false);
  const source = artifacts[0].source!;
  const tokens = tokensOf(artifacts.reduce((n, a) => n + (a.text?.length ?? 0), 0));
  return (
    <div className="flex w-full flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`focus-ring flex h-12 max-w-full items-center gap-2.5 rounded-[12px] bg-control p-1.5 pe-2.5 text-start transition-colors duration-200 hover:bg-control-hover ${rowPress}`}
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[8px] bg-raised text-fg-4">{source.kind === "github" ? <BranchIcon size={16} /> : <GlobeIcon size={16} />}</span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-[13px] text-fg">{source.label}</span>
          <span className="text-[11px] text-fg-5 tabular-nums">
            {artifacts.length} files · {short(tokens)} tokens
          </span>
        </span>
        <ChevronDownIcon size={15} className={`shrink-0 text-fg-4 transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="w-full overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1, transition: { duration: 0.28, ease: easeOut } }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.18, ease: easeOut } }}
          >
            <ul className="flex max-h-72 flex-wrap justify-end gap-1.5 overflow-y-auto">
              {artifacts.map((a) => (
                <li key={a.id}>
                  <DocChip a={a} />
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** What a message carries: images open full size, documents open in the panel on the right. */
function Attachments({ ids, artifacts }: { ids: string[]; artifacts: Record<string, Artifact> }) {
  const list = ids.map((id) => artifacts[id]).filter(Boolean);
  const images = list.filter((a) => a.kind === "image").map((a) => a.id);
  const [shown, setShown] = useState<number | null>(null);
  const [all, setAll] = useState(false);
  // files that came in together (a repository) show as one chip
  const bundles = new Map<string, Artifact[]>();
  for (const a of list) if (a.source) bundles.set(a.source.label, [...(bundles.get(a.source.label) ?? []), a]);
  for (const [label, group] of bundles) if (group.length < 2) bundles.delete(label);
  const loose = list.filter((a) => !a.source || !bundles.has(a.source.label));
  // Many loose files can arrive in one message too: the first few, and the rest behind "Show more".
  const folded = loose.length > MANY ? loose.length - FEW : 0;
  const visible = folded && !all ? loose.slice(0, FEW) : loose;
  return (
    <div className="flex flex-col items-end gap-1.5">
      {[...bundles].map(([label, group]) => (
        <SourceFiles key={label} artifacts={group} />
      ))}
      <ul className="flex flex-wrap justify-end gap-1.5">
        {visible.map((a, n) =>
          a.kind === "image" ? (
            <li key={a.id}>
              <button type="button" onClick={() => setShown(images.indexOf(a.id))} aria-label={`Open ${a.name}`} className="focus-ring group block overflow-hidden rounded-[12px]">
                {/* eslint-disable-next-line @next/next/no-img-element -- data URLs and tiny local stills */}
                <img src={a.src} alt={a.caption ?? a.name} className="h-20 bg-surface object-cover transition-[scale,opacity] duration-300 ease-out group-hover:scale-[1.03] group-active:opacity-80" />
              </button>
            </li>
          ) : (
            <motion.li
              key={a.id}
              initial={n >= FEW ? { opacity: 0, filter: "blur(4px)" } : false}
              animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 0.25, ease: easeOut, delay: Math.min(0.3, (n - FEW) * 0.008) } }}
            >
              <DocChip a={a} />
            </motion.li>
          ),
        )}
        <Lightbox ids={images} index={shown} onIndex={setShown} onClose={() => setShown(null)} />
      </ul>
      <MoreToggle hidden={folded} open={all} onToggle={() => setAll((v) => !v)} noun="files" />
    </div>
  );
}

export const UserMessage = memo(function UserMessage({ message, artifacts }: { message: Message; artifacts: Record<string, Artifact> }) {
  return (
    <div className="flex flex-col items-end gap-1.5">
      {!!message.artifacts?.length && <Attachments ids={message.artifacts} artifacts={artifacts} />}
      {message.text && <p className="max-w-[85%] rounded-[16px] bg-control px-3.5 py-2 text-[15px] leading-[1.6] text-pretty whitespace-pre-wrap text-fg">{message.text}</p>}
    </div>
  );
});

export function AssistantMessage({
  message,
  recallNumber,
  onRecall,
  onRetry,
  answer,
  onData,
  busy,
}: {
  /** What the user sent next, so an Options block shows which answer was picked. */
  answer?: string;
  onData: (id: string, data: unknown, extra?: number) => void;
  busy: boolean;
  message: Message;
  recallNumber?: number;
  onRecall: (id: string) => void;
  onRetry: (id: string) => void;
}) {
  const turn = message.turn;
  const writing = turn?.status === "writing";
  const settled = !turn || turn.status === "done" || turn.status === "error";
  // every component in the reply, the main one first
  const parts = [...(message.component ? [{ component: message.component, data: message.data }] : []), ...(message.extras ?? [])];
  const missing = turn?.status === "done" ? parts.filter((p) => !blockReady(p.component, p.data)) : [];
  return (
    <div className="flex flex-col gap-2.5">
      {turn && (turn.status !== "error" || turn.decision) && (
        <DecisionLine decision={turn.decision} recallNumber={recallNumber} onRecall={() => turn.decision?.recall && onRecall(turn.decision.recall)} writer={turn.writer} writeMs={turn.writeMs} />
      )}
      {message.text && <Prose text={message.text} streaming={writing} />}
      {message.component && <Block id={message.component} data={message.data} settled={settled} answer={answer} onChange={(d) => onData(message.id, d)} />}
      {/* When the question asked for more than one kind of thing, the rest follow, each in its own card. */}
      {message.extras?.map((e, i) => (
        <Block key={`${e.component}-${i}`} id={e.component} data={e.data} settled={settled} answer={answer} onChange={(d) => onData(message.id, d, i)} />
      ))}
      {missing.length > 0 && (
        // The writer finished without filling a component: say so instead of leaving a gap.
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-fg-3" role="status">
          The {missing.map((p) => blocks[p.component].label.toLowerCase()).join(" and the ")} didn&apos;t come through.
          {!busy && (
            <button type="button" onClick={() => onRetry(message.id)} className="focus-ring h-7 rounded-[8px] bg-control px-2.5 text-[12px] font-medium text-fg hover:bg-control-hover">
              Ask again
            </button>
          )}
        </p>
      )}
      {settled && turn?.status !== "error" && (message.text || message.component) && (
        // Under every finished reply: copy it whole (text and component), or ask again. Quiet until pointed at,
        // always there on touch screens.
        <div className="-ms-1.5 flex gap-0.5 opacity-0 transition-opacity duration-150 group-hover/msg:opacity-100 group-focus-within/msg:opacity-100 [@media(hover:none)]:opacity-100">
          <CopyAction showLabel={false} label="Copy reply" text={() => [message.text, ...parts.map((p) => blockText(p.component, p.data))].filter(Boolean).join("\n\n")} />
          {turn && !busy && <Action showLabel={false} label="Ask again" icon={<RotateIcon size={14} />} onClick={() => onRetry(message.id)} />}
        </div>
      )}
      <AnimatePresence initial={false}>
        {turn?.status === "error" && (
          <motion.div initial={{ opacity: 0, filter: "blur(4px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]" role="alert">
            <span className="flex items-center gap-2 text-fg-2">
              <span aria-hidden className="size-1.5 rounded-full bg-rose-500" />
              {turn.error}
            </span>
            <motion.button
              type="button"
              whileTap={press}
              onClick={() => onRetry(message.id)}
              className="focus-ring h-7 rounded-[8px] bg-control px-2.5 text-[12px] font-medium text-fg hover:bg-control-hover"
            >
              Try again
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

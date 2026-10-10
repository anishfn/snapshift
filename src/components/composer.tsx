"use client";

import { AnimatePresence, motion } from "motion/react";
import { useContext, useRef, type KeyboardEvent } from "react";
import { BranchIcon, GlobeIcon, NoteIcon, PaperclipIcon, ReturnIcon, XIcon } from "@/components/icons";
import { ACCEPT } from "@/lib/files";
import { easeOut, iconSwap, press, rowPress } from "@/lib/motion";
import { tokensOf } from "@/lib/sources";
import type { Artifact } from "@/lib/types";
import { Popover } from "./popover";
import type { SourceKind } from "./sources/source-dialog";
import { DocViewerContext } from "./viewer/doc-panel";

const KINDS: Record<string, string> = {
  ui_screenshot: "Screenshot",
  chart: "Chart",
  photo: "Photo",
  illustration: "Illustration",
  document: "Page",
  diagram: "Diagram",
  other: "Image",
};

const chip = {
  initial: { opacity: 0, scale: 0.96, filter: "blur(4px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.22, ease: easeOut } },
  exit: { opacity: 0, scale: 0.96, filter: "blur(4px)", transition: { duration: 0.12, ease: easeOut } },
};

function Attachment({ artifact, onRemove }: { artifact: Artifact; onRemove: () => void }) {
  const t = artifact.tags;
  const viewer = useContext(DocViewerContext);
  return (
    <motion.li layout="position" {...chip} className="flex h-12 items-center gap-2 rounded-[12px] bg-surface p-1 pe-1.5">
      {artifact.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element -- a local data URL
        <img src={artifact.src} alt="" className="size-10 rounded-[8px] object-cover" />
      ) : (
        // a document can be checked in the panel before it's sent
        <button
          type="button"
          onClick={() => viewer.open(artifact.id)}
          aria-label={`Open ${artifact.name}`}
          className="focus-ring flex size-10 items-center justify-center rounded-[8px] bg-raised text-fg-4 transition-colors hover:text-fg"
        >
          <NoteIcon size={18} />
        </button>
      )}
      <div className="flex min-w-0 flex-col">
        <span className="max-w-[9rem] truncate text-[12px] text-fg">{artifact.name}</span>
        <span className="relative h-4 text-[11px] text-fg-4 tabular-nums">
          <AnimatePresence mode="popLayout" initial={false}>
            {artifact.kind === "doc" ? (
              <motion.span key="doc" className="block">
                {/* a PDF's text isn't read until it's sent, so it shows its size, never a guessed token count */}
                {artifact.text != null ? `${short(Math.max(1, Math.round(artifact.text.length / 4)))} tokens` : `PDF · ${artifact.bytes >= 1048576 ? `${(artifact.bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(artifact.bytes / 1024))} KB`}`}
              </motion.span>
            ) : t ? (
              <motion.span key="tags" {...chip} className="block whitespace-nowrap">
                Snap: {KINDS[t.kind] ?? "Image"}, {t.dark > 0.5 ? "dark" : "light"}
                {t.hasText > 0.5 ? ", text" : ""} · {t.ms}ms
              </motion.span>
            ) : (
              <motion.span key="looking" {...chip} className="block">
                Snap is looking
              </motion.span>
            )}
          </AnimatePresence>
        </span>
      </div>
      <motion.button
        type="button"
        onClick={onRemove}
        whileTap={press}
        aria-label={`Remove ${artifact.name}`}
        className="focus-ring flex size-6 shrink-0 items-center justify-center rounded-[8px] text-fg-4 hover:bg-white/[0.08] hover:text-fg"
      >
        <XIcon size={14} />
      </motion.button>
    </motion.li>
  );
}

const short = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}k` : `${n}`);

/** A whole repository (or anything else that arrived as many files) as one chip: what it is, how much it is. */
function Bundle({ artifacts, onRemove }: { artifacts: Artifact[]; onRemove: () => void }) {
  const source = artifacts[0].source!;
  const tokens = tokensOf(artifacts.reduce((n, a) => n + (a.text?.length ?? 0), 0));
  return (
    <motion.li layout="position" {...chip} className="flex h-12 items-center gap-2 rounded-[12px] bg-surface p-1 pe-1.5">
      <span className="flex size-10 items-center justify-center rounded-[8px] bg-raised text-fg-4">{source.kind === "github" ? <BranchIcon size={18} /> : <GlobeIcon size={18} />}</span>
      <div className="flex min-w-0 flex-col">
        <span className="max-w-[12rem] truncate text-[12px] text-fg">{source.label}</span>
        <span className="h-4 text-[11px] whitespace-nowrap text-fg-4 tabular-nums">
          {artifacts.length} files · {short(tokens)} tokens
        </span>
      </div>
      <motion.button
        type="button"
        onClick={onRemove}
        whileTap={press}
        aria-label={`Remove ${source.label}`}
        className="focus-ring flex size-6 shrink-0 items-center justify-center rounded-[8px] text-fg-4 hover:bg-white/[0.08] hover:text-fg"
      >
        <XIcon size={14} />
      </motion.button>
    </motion.li>
  );
}

const MENU = "focus-ring flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2 text-start text-[13px] text-fg-2 hover:bg-white/[0.06] hover:text-fg";

export function Composer({
  attachments,
  busy,
  suggestions,
  onSend,
  onFiles,
  onSource,
  onRemove,
  text,
  onText,
}: {
  /** Open the dialog that brings in a repository or a web page. */
  onSource: (kind: SourceKind) => void;
  /** The draft lives with the chat, so it survives the composer moving and other parts can fill it in. */
  text: string;
  onText: (text: string) => void;
  attachments: Artifact[];
  busy: boolean;
  suggestions: string[];
  onSend: (text: string) => void;
  onFiles: (files: File[]) => void;
  onRemove: (id: string) => void;
}) {
  const field = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const canSend = !busy && (text.trim().length > 0 || attachments.length > 0);
  // files that came in together (a repository) show as one chip
  const bundles = new Map<string, Artifact[]>();
  for (const a of attachments) if (a.source) bundles.set(a.source.label, [...(bundles.get(a.source.label) ?? []), a]);
  for (const [label, list] of bundles) if (list.length < 2) bundles.delete(label);
  const loose = attachments.filter((a) => !a.source || !bundles.has(a.source.label));

  const submit = (value = text) => {
    if (busy || (!value.trim() && !attachments.length)) return;
    onSend(value.trim());
    onText("");
    field.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex flex-col gap-2.5">
      <AnimatePresence initial={false}>
        {suggestions.length > 0 && !text && (
          <motion.ul {...chip} className="no-scrollbar -mx-5 flex gap-1.5 overflow-x-auto px-5" aria-label="Try asking">
            {suggestions.map((s) => (
              <li key={s}>
                <motion.button
                  type="button"
                  whileTap={press}
                  disabled={busy}
                  onClick={() => submit(s)}
                  className="focus-ring h-8 shrink-0 rounded-[10px] bg-raised px-3 text-[13px] whitespace-nowrap text-fg-2 shadow-faint transition-colors hover:bg-white/[0.06] hover:text-fg disabled:text-fg-5"
                >
                  {s}
                </motion.button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>

      <div className="field-focus flex flex-col gap-2 rounded-[20px] bg-raised p-2 transition-shadow duration-200">
        <AnimatePresence initial={false}>
          {attachments.length > 0 && (
            <motion.ul {...chip} className="flex flex-wrap gap-1.5" aria-label="Attached">
              <AnimatePresence initial={false} mode="popLayout">
                {[...bundles].map(([label, list]) => (
                  <Bundle key={label} artifacts={list} onRemove={() => list.forEach((a) => onRemove(a.id))} />
                ))}
                {loose.map((a) => (
                  <Attachment key={a.id} artifact={a} onRemove={() => onRemove(a.id)} />
                ))}
              </AnimatePresence>
            </motion.ul>
          )}
        </AnimatePresence>
        <label className="sr-only" htmlFor="composer">
          Message
        </label>
        <textarea
          id="composer"
          ref={field}
          value={text}
          onChange={(e) => onText(e.target.value)}
          onKeyDown={onKeyDown}
          onPaste={(e) => {
            const files = [...e.clipboardData.files];
            if (files.length) {
              e.preventDefault();
              onFiles(files);
            }
          }}
          rows={1}
          placeholder="Ask anything, or drop in images and docs"
          className="field-sizing-content max-h-48 min-h-10 resize-none bg-transparent px-2 pt-1.5 text-[16px] leading-relaxed text-fg outline-none placeholder:text-fg-5 sm:text-[15px]"
        />
        <div className="flex items-center justify-between">
          <Popover
            side="top"
            menu
            label="Attach"
            trigger={({ toggle, open: _open, ...aria }) => (
              <motion.button
                type="button"
                whileTap={press}
                onClick={toggle}
                {...aria}
                className="focus-ring flex h-8 items-center gap-1.5 rounded-[10px] px-2 text-[13px] text-fg-4 hover:bg-white/[0.06] hover:text-fg aria-expanded:bg-white/[0.06] aria-expanded:text-fg"
              >
                <PaperclipIcon size={16} />
                Attach
              </motion.button>
            )}
          >
            {(close) => (
              <ul className="flex flex-col">
                {(
                  [
                    ["Files from this device", <PaperclipIcon key="i" size={16} />, () => picker.current?.click()],
                    ["A GitHub repository", <BranchIcon key="i" size={16} />, () => onSource("github")],
                    ["A web page", <GlobeIcon key="i" size={16} />, () => onSource("page")],
                  ] as const
                ).map(([label, icon, act]) => (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={() => {
                        close();
                        act();
                      }}
                      className={`${MENU} ${rowPress}`}
                    >
                      <span className="text-fg-4">{icon}</span>
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Popover>
          <input
            ref={picker}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => {
              onFiles([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
          <motion.button
            type="button"
            whileTap={canSend ? press : undefined}
            onClick={() => submit()}
            disabled={!canSend}
            aria-label="Send"
            className="focus-ring flex size-8 items-center justify-center rounded-[10px] bg-accent text-accent-fg transition-colors duration-150 disabled:bg-control disabled:text-fg-5"
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={busy ? "busy" : "send"} {...iconSwap} className="flex">
                {busy ? <span className="size-3.5 animate-spin rounded-full border-[1.5px] border-current border-t-transparent motion-reduce:animate-none" /> : <ReturnIcon size={16} />}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </div>
      </div>
    </div>
  );
}

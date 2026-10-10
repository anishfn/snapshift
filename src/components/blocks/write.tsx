"use client";

import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { ArrowUpRightIcon, MailIcon } from "@/components/icons";
import type { DraftData, LinksData, RewriteData } from "@/lib/blocks";
import { easeOut, glide } from "@/lib/motion";
import { Action, Arrive, Bar, BlockHeader, type BlockProps } from "./shared";

/* ---------- draft: ready to send, editable first ---------- */

const KIND = { email: "Email", message: "Message", post: "Post" } as const;

export function Draft({ data, settled, onChange }: BlockProps<DraftData>) {
  const body = data.body ?? "";
  const kind = data.kind && data.kind in KIND ? data.kind : "message";
  const mail = `mailto:${encodeURIComponent(data.to ?? "")}?subject=${encodeURIComponent(data.subject ?? "")}&body=${encodeURIComponent(body)}`;
  return (
    <div className="flex flex-col gap-2 px-2 py-1">
      <BlockHeader meta={kind === "post" ? `${body.length} characters` : undefined}>
        {kind === "email" && settled && <Action label="Open in Mail" icon={<MailIcon size={14} />} href={mail} />}
      </BlockHeader>
      <div className="flex flex-col rounded-[12px] bg-surface">
        {(data.to || data.subject) && (
          <div className="flex flex-col border-b border-line px-4 py-2 text-[13px]">
            {data.to && (
              <p className="flex gap-3 py-0.5">
                <span className="w-14 shrink-0 text-fg-5">To</span>
                <span className="text-fg-2">{data.to}</span>
              </p>
            )}
            {data.subject && (
              <p className="flex gap-3 py-0.5">
                <span className="w-14 shrink-0 text-fg-5">Subject</span>
                <span className="text-fg">{data.subject}</span>
              </p>
            )}
          </div>
        )}
        {/* the body can be touched up before copying; edits are kept with the conversation */}
        <textarea
          aria-label={`${KIND[kind]} text`}
          value={body}
          readOnly={!settled || !onChange}
          onChange={(e) => onChange?.({ ...data, body: e.target.value })}
          className="field-sizing-content min-h-24 resize-none bg-transparent px-4 py-3 text-[14px] leading-relaxed text-fg-2 outline-none focus-visible:text-fg"
        />
      </div>
    </div>
  );
}

export const draftText = (d: BlockProps<DraftData>["data"]) => [d.to && `To: ${d.to}`, d.subject && `Subject: ${d.subject}`, d.body].filter(Boolean).join("\n\n");

export function DraftSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-2 py-1">
      <Bar className="h-3.5 w-16" />
      <div className="flex flex-col gap-2.5 rounded-[12px] bg-surface p-4">
        <Bar className="h-3 w-1/3" />
        <Bar className="h-3 w-full" />
        <Bar className="h-3 w-5/6" />
        <Bar className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/* ---------- links: where to go next ---------- */

const host = (url?: string) => {
  try {
    return new URL(url ?? "").hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

/** The site's own name, for its initial: developer.chrome.com is "chrome", web.dev is "web". */
const site = (h: string) => {
  const parts = h.split(".");
  return parts.length > 2 ? parts[parts.length - 2] : parts[0];
};

export function Links({ data }: BlockProps<LinksData>) {
  const items = (data.items ?? []).filter((i) => i?.title && host(i.url));
  return (
    <div className="flex flex-col gap-1 px-1 py-1">
      <ul className="flex flex-col">
        {items.map((it, i) => {
          const h = host(it?.url);
          return (
            <Arrive as="li" key={i}>
              <a
                href={it?.url}
                target="_blank"
                rel="noreferrer"
                className="focus-ring group flex items-start gap-3 rounded-[12px] p-2 transition-colors hover:bg-white/[0.04]"
              >
                {/* the site's initial on a tile: no favicon service, nothing fetched from a third party */}
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface text-[14px] font-medium text-fg-2 uppercase">{site(h)[0]}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="flex items-center gap-1.5 text-[14px] text-fg">
                    <span className="truncate">{it?.title}</span>
                    <ArrowUpRightIcon size={13} className="shrink-0 text-fg-5 transition-colors group-hover:text-fg-2" />
                  </span>
                  <span className="text-[12px] text-fg-5">{h}</span>
                  {it?.note && <span className="text-[13px] leading-snug text-pretty text-fg-3">{it.note}</span>}
                </span>
              </a>
            </Arrive>
          );
        })}
      </ul>
    </div>
  );
}

export const linksText = (d: BlockProps<LinksData>["data"]) => (d.items ?? []).map((i) => `${i?.title}: ${i?.url}${i?.note ? `\n  ${i.note}` : ""}`).join("\n");

export function LinksSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3">
          <div className="skeleton size-9 rounded-[10px]" />
          <div className="flex flex-1 flex-col gap-1.5 pt-0.5">
            <Bar className="h-3 w-2/5" />
            <Bar className="h-2.5 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- rewrite: what changed, word by word ---------- */

type Part = { text: string; kind: "same" | "add" | "del" };

/** A word-level diff (longest common subsequence). Whitespace travels with the word before it. */
function diff(a: string, b: string): Part[] {
  const x = a.split(/(?<=\s)(?=\S)/);
  const y = b.split(/(?<=\s)(?=\S)/);
  if (x.length * y.length > 400_000) return [{ text: b, kind: "add" }];
  const dp = Array.from({ length: x.length + 1 }, () => new Uint16Array(y.length + 1));
  for (let i = x.length - 1; i >= 0; i--)
    for (let j = y.length - 1; j >= 0; j--) dp[i][j] = x[i].trim() === y[j].trim() ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out: Part[] = [];
  const push = (text: string, kind: Part["kind"]) => {
    const last = out[out.length - 1];
    if (last?.kind === kind) last.text += text;
    else out.push({ text, kind });
  };
  let i = 0;
  let j = 0;
  while (i < x.length && j < y.length) {
    if (x[i].trim() === y[j].trim()) {
      push(y[j], "same");
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) push(x[i++], "del");
    else push(y[j++], "add");
  }
  while (i < x.length) push(x[i++], "del");
  while (j < y.length) push(y[j++], "add");
  return out;
}

const VIEWS = ["Changes", "New", "Original"] as const;

export function Rewrite({ data, settled }: BlockProps<RewriteData>) {
  const [view, setView] = useState<(typeof VIEWS)[number]>("Changes");
  const pill = useId();
  const parts = settled ? diff(data.original ?? "", data.revised ?? "") : [];
  const added = parts.filter((p) => p.kind === "add").reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0);
  const removed = parts.filter((p) => p.kind === "del").reduce((n, p) => n + p.text.split(/\s+/).filter(Boolean).length, 0);
  return (
    <div className="flex flex-col gap-2 px-2 py-1">
      <BlockHeader meta={settled ? `${added} words in, ${removed} out` : undefined}>
        <div role="tablist" aria-label="View" className="flex gap-0.5 rounded-[10px] bg-surface p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`focus-ring relative h-6 rounded-[8px] px-2 text-[12px] transition-colors duration-200 ${view === v ? "text-fg" : "text-fg-4 hover:text-fg-2"}`}
            >
              {view === v && <motion.span layoutId={`${pill}-view`} transition={glide} className="absolute inset-0 rounded-[8px] bg-control" />}
              <span className="relative">{v}</span>
            </button>
          ))}
        </div>
      </BlockHeader>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={settled ? view : "streaming"}
          className="rounded-[12px] bg-surface px-4 py-3 text-[14px] leading-relaxed whitespace-pre-wrap text-fg-2"
          initial={{ opacity: 0, filter: "blur(4px)" }}
          animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 0.2, ease: easeOut } }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
        >
          {!settled || view === "New"
            ? data.revised
            : view === "Original"
              ? data.original
              : parts.map((p, i) =>
                  p.kind === "same" ? (
                    <span key={i}>{p.text}</span>
                  ) : p.kind === "add" ? (
                    <ins key={i} className="rounded-[3px] bg-white/[0.1] text-fg no-underline">
                      {p.text}
                    </ins>
                  ) : (
                    <del key={i} className="text-fg-5 decoration-fg-5">
                      {p.text}
                    </del>
                  ),
                )}
        </motion.div>
      </AnimatePresence>
      {data.summary && <p className="text-[12px] text-pretty text-fg-4">{data.summary}</p>}
    </div>
  );
}

export const rewriteText = (d: BlockProps<RewriteData>["data"]) => d.revised ?? "";

export function RewriteSkeleton() {
  return (
    <div className="flex flex-col gap-2 px-2 py-1">
      <Bar className="ms-auto h-7 w-40" />
      <div className="flex flex-col gap-2.5 rounded-[12px] bg-surface p-4">
        <Bar className="h-3 w-full" />
        <Bar className="h-3 w-5/6" />
        <Bar className="h-3 w-3/5" />
      </div>
    </div>
  );
}

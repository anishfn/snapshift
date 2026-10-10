"use client";

import { AnimatePresence, motion } from "motion/react";
import { createContext, useCallback, useEffect, useId, useRef, useState } from "react";
import { Action, CopyAction, Swap } from "@/components/blocks/shared";
import { DownloadIcon, MinusIcon, NoteIcon, PlusIcon, XIcon } from "@/components/icons";
import { easeOut, glide } from "@/lib/motion";
import type { Artifact } from "@/lib/types";
import { PdfPages } from "./pdf-pages";
import { docKind, TextView } from "./text-view";

// Documents open in a panel on the right, the way other assistants do it: the chat narrows beside it on a wide
// screen, and on a phone it covers the chat. One document at a time; opening another swaps the contents. Drag the
// left edge to resize; Escape or × closes, and focus goes back to whatever opened it.

export const DocViewerContext = createContext<{ open: (id: string) => void; openId: string | null }>({ open: () => {}, openId: null });

export const PANEL_MIN = 380;
export const panelDefault = () => Math.round(Math.min(680, Math.max(PANEL_MIN, window.innerWidth * 0.44)));

const KIND_LABEL: Record<string, string> = { pdf: "PDF", markdown: "Markdown", csv: "CSV", tsv: "TSV", json: "JSON", xml: "XML", text: "Text" };
const ZOOMS = [0.5, 0.67, 0.8, 1, 1.25, 1.5, 2];

const size = (bytes: number) => (bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : bytes >= 1e3 ? `${Math.round(bytes / 1e3)} KB` : `${bytes} B`);

function download(a: Artifact) {
  const blob = a.base64
    ? new Blob([Uint8Array.from(atob(a.base64), (c) => c.charCodeAt(0))], { type: a.mediaType })
    : new Blob([a.text ?? ""], { type: a.mediaType || "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = a.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function DocPanel({
  artifact,
  wide,
  width,
  onWidth,
  onClose,
  onResizing,
}: {
  artifact: Artifact | null;
  wide: boolean;
  width: number;
  onWidth: (w: number) => void;
  onClose: () => void;
  /** While the edge is dragged, the chat follows it directly instead of easing after it. */
  onResizing: (on: boolean) => void;
}) {
  // On a phone the panel covers the chat: the chat behind it shouldn't scroll.
  const covering = !!artifact && !wide;
  useEffect(() => {
    if (!covering) return;
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = before;
    };
  }, [covering]);

  return (
    <AnimatePresence>
      {artifact && (
        <motion.aside
          key="doc-panel"
          role="dialog"
          aria-label={artifact.name}
          aria-modal={!wide}
          className={`fixed inset-y-0 right-0 z-50 flex flex-col bg-sidebar ${wide ? "shadow-[inset_1px_0_0_var(--line)]" : "w-full"}`}
          style={wide ? { width } : undefined}
          initial={{ x: "100%" }}
          animate={{ x: 0, transition: { duration: 0.34, ease: easeOut } }}
          exit={{ x: "100%", transition: { duration: 0.22, ease: easeOut } }}
        >
          {wide && <ResizeEdge width={width} onWidth={onWidth} onResizing={onResizing} />}
          <Viewer artifact={artifact} onClose={onClose} />
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/** The panel's left edge: drag to resize, arrow keys too. A hairline that brightens when it's yours. */
function ResizeEdge({ width, onWidth, onResizing }: { width: number; onWidth: (w: number) => void; onResizing: (on: boolean) => void }) {
  const start = useRef<{ x: number; w: number } | null>(null);
  const clamp = (w: number) => Math.round(Math.max(PANEL_MIN, Math.min(w, window.innerWidth - 480)));
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize the document panel"
      aria-valuenow={width}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") onWidth(clamp(width + 24));
        if (e.key === "ArrowRight") onWidth(clamp(width - 24));
      }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start.current = { x: e.clientX, w: width };
        onResizing(true);
      }}
      onPointerMove={(e) => start.current && onWidth(clamp(start.current.w + (start.current.x - e.clientX)))}
      onPointerUp={() => {
        start.current = null;
        onResizing(false);
      }}
      className="group focus-ring absolute inset-y-0 -left-1.5 z-10 w-3 cursor-col-resize touch-none"
    >
      <span className="absolute inset-y-0 left-1.5 w-px bg-transparent transition-colors duration-150 group-hover:bg-line-strong group-active:bg-fg-4 group-focus-visible:bg-fg-4" />
    </div>
  );
}

function Viewer({ artifact: a, onClose }: { artifact: Artifact; onClose: () => void }) {
  const kind = docKind(a.mediaType, a.name);
  const isPdf = kind === "pdf" && !!a.base64;
  const [view, setView] = useState<"pages" | "text">("pages");
  const [zoom, setZoom] = useState(1);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [pdfText, setPdfText] = useState("");
  const close = useRef<HTMLButtonElement>(null);
  const pill = useId();

  // A new document starts at the top, at fit, on its pages.
  const [shown, setShown] = useState(a.id);
  if (shown !== a.id) {
    setShown(a.id);
    setView("pages");
    setZoom(1);
    setPages(0);
    setPage(1);
    setPdfText("");
  }

  useEffect(() => {
    close.current?.focus({ preventScroll: true });
  }, [a.id]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // an image viewer open on top takes Escape first
      const above = [...document.querySelectorAll('[role="dialog"][aria-modal="true"]')].some((d) => !d.contains(close.current));
      if (!above) onClose();
    };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);

  const onPage = useCallback((n: number) => setPage(n), []);
  const text = isPdf ? pdfText : (a.text ?? "");
  const zi = ZOOMS.indexOf(zoom);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex shrink-0 flex-col gap-2 border-b border-line px-4 pt-4 pb-3">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-surface text-fg-3">
            <NoteIcon size={17} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 className="truncate text-[14px] font-medium text-fg" title={a.name}>
              {a.name}
            </h2>
            <p className="text-[12px] text-fg-4 tabular-nums">
              {KIND_LABEL[kind] ?? "Document"}
              {a.bytes > 0 && ` · ${size(a.bytes)}`}
              {isPdf && pages > 0 && (
                <>
                  {" · "}
                  <Swap value={`${pages} ${pages === 1 ? "page" : "pages"}`} />
                </>
              )}
            </p>
          </div>
          <div className="-me-1.5 flex items-center gap-0.5">
            <CopyAction showLabel={false} label="Copy text" text={() => text} />
            <Action showLabel={false} label="Download" icon={<DownloadIcon size={15} />} onClick={() => download(a)} />
            <button
              ref={close}
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="focus-ring flex size-7 items-center justify-center rounded-[8px] text-fg-4 transition-colors hover:bg-white/[0.06] hover:text-fg"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>
        {isPdf && (
          <div className="flex items-center justify-between gap-2">
            <div role="tablist" aria-label="View" className="flex gap-0.5 rounded-[10px] bg-surface p-0.5">
              {(["pages", "text"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="tab"
                  aria-selected={view === v}
                  onClick={() => setView(v)}
                  className={`focus-ring relative h-6 rounded-[8px] px-2.5 text-[12px] capitalize transition-colors duration-200 ${view === v ? "text-fg" : "text-fg-4 hover:text-fg-2"}`}
                >
                  {view === v && <motion.span layoutId={`${pill}-v`} transition={glide} className="absolute inset-0 rounded-[8px] bg-control" />}
                  <span className="relative">{v}</span>
                </button>
              ))}
            </div>
            <AnimatePresence initial={false}>
              {view === "pages" && (
                <motion.div
                  className="flex items-center gap-1 text-[12px] text-fg-4 tabular-nums"
                  initial={{ opacity: 0, filter: "blur(4px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 0.18 } }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                >
                  {pages > 0 && (
                    <span className="me-2" aria-live="polite">
                      <Swap value={page} /> / {pages}
                    </span>
                  )}
                  <Action showLabel={false} label="Zoom out" icon={<MinusIcon size={14} />} onClick={() => zi > 0 && setZoom(ZOOMS[zi - 1])} />
                  <button
                    type="button"
                    onClick={() => setZoom(1)}
                    className="focus-ring h-7 min-w-11 rounded-[8px] px-1 text-center transition-colors hover:bg-white/[0.06] hover:text-fg"
                    aria-label="Fit to width"
                  >
                    <Swap value={`${Math.round(zoom * 100)}%`} />
                  </button>
                  <Action showLabel={false} label="Zoom in" icon={<PlusIcon size={14} />} onClick={() => zi < ZOOMS.length - 1 && setZoom(ZOOMS[zi + 1])} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </header>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={`${a.id}-${view}`}
          className="min-h-0 flex-1 overflow-auto overscroll-contain"
          initial={{ opacity: 0, filter: "blur(4px)" }}
          animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 0.22, ease: easeOut } }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
        >
          {isPdf && view === "pages" ? (
            <PdfPages base64={a.base64!} zoom={zoom} onPages={setPages} onPage={onPage} onText={setPdfText} />
          ) : (
            <div className="mx-auto max-w-[72ch] px-5 py-5">
              {isPdf && !pdfText ? (
                <p className="text-[13px] text-fg-4">Reading the text…</p>
              ) : isPdf ? (
                <TextView text={pdfText} kind="text" />
              ) : (
                <TextView text={a.text ?? ""} kind={kind} />
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { easeOut } from "@/lib/motion";

// A PDF drawn page by page with PDF.js (loaded only when a PDF is opened; its worker is served from /public).
// Pages are white sheets on the panel's dark ground, fitted to the panel's width times the zoom, drawn at the
// screen's pixel density, and only once they come near the viewport. The page most in view is reported up.

type Props = { base64: string; zoom: number; onPages: (n: number) => void; onPage: (n: number) => void; onText: (text: string) => void };

async function load(base64: string) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return pdfjs.getDocument({ data: bytes }).promise;
}

export function PdfPages({ base64, zoom, onPages, onPage, onText }: Props) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [failed, setFailed] = useState(false);
  const [aspect, setAspect] = useState(1.414);
  const [width, setWidth] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let live = true;
    let opened: PDFDocumentProxy | null = null;
    load(base64)
      .then(async (d) => {
        if (!live) return d.loadingTask.destroy();
        opened = d;
        const first = await d.getPage(1);
        const vp = first.getViewport({ scale: 1 });
        setAspect(vp.height / vp.width);
        setDoc(d);
        onPages(d.numPages);
        // The text, for Copy and the Text view, read in the background.
        const pages: string[] = [];
        for (let i = 1; i <= d.numPages; i++) {
          const content = await (await d.getPage(i)).getTextContent();
          pages.push(content.items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : "") : "")).join(""));
        }
        if (live) onText(pages.map((p, i) => `[page ${i + 1}]\n${p.trim()}`).join("\n\n"));
      })
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
      opened?.loadingTask.destroy();
    };
    // the callbacks are stable setters from the panel
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base64]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Which page is most in view.
  useEffect(() => {
    const el = box.current;
    if (!el || !doc) return;
    const seen = new Map<number, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set(Number((e.target as HTMLElement).dataset.page), e.intersectionRatio);
        const best = [...seen.entries()].sort((a, b) => b[1] - a[1])[0];
        if (best) onPage(best[0]);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    el.querySelectorAll("[data-page]").forEach((p) => io.observe(p));
    return () => io.disconnect();
  }, [doc, onPage]);

  if (failed) return <p className="px-6 py-10 text-center text-[13px] text-fg-4">This PDF couldn&apos;t be opened. It may be damaged or protected.</p>;

  const pageW = Math.max(120, (width - 32) * zoom);
  return (
    <div ref={box} className="flex flex-col items-center gap-4 px-4 py-4">
      {doc
        ? Array.from({ length: doc.numPages }, (_, i) => <Page key={i} doc={doc} n={i + 1} width={pageW} aspect={aspect} />)
        : [0, 1].map((i) => <div key={i} className="skeleton w-full rounded-[4px]" style={{ aspectRatio: `1 / ${aspect}` }} />)}
    </div>
  );
}

/** One page: drawn when it nears the viewport, redrawn when the width changes, faded in once drawn. */
function Page({ doc, n, width, aspect }: { doc: PDFDocumentProxy; n: number; width: number; aspect: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(n <= 2);
  const [drawn, setDrawn] = useState(false);
  const [ratio, setRatio] = useState(aspect);

  useEffect(() => {
    const el = holder.current;
    if (!el || near) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: "800px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [near]);

  useEffect(() => {
    if (!near || !canvas.current || width < 50) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    (async () => {
      const page = await doc.getPage(n);
      if (cancelled || !canvas.current) return;
      const base = page.getViewport({ scale: 1 });
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = page.getViewport({ scale: (width / base.width) * dpr });
      const c = canvas.current;
      c.width = Math.floor(vp.width);
      c.height = Math.floor(vp.height);
      setRatio(base.height / base.width);
      task = page.render({ canvas: c, viewport: vp });
      await task.promise.catch(() => {});
      if (!cancelled) setDrawn(true);
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, n, near, width]);

  return (
    <div ref={holder} data-page={n} className="relative w-full shrink-0" style={{ width, aspectRatio: `1 / ${ratio}` }}>
      <AnimatePresence initial={false}>
        {!drawn && (
          <motion.div className="skeleton absolute inset-0 rounded-[4px]" exit={{ opacity: 0, transition: { duration: 0.2, ease: easeOut } }} />
        )}
      </AnimatePresence>
      <canvas
        ref={canvas}
        aria-label={`Page ${n}`}
        className={`absolute inset-0 size-full rounded-[4px] bg-white shadow-surface transition-opacity duration-300 ease-out ${drawn ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}

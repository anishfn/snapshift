"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { easeOut } from "@/lib/motion";

/** Drop files anywhere on the page. While a file is held over it, the page says so; nothing else moves. */
export function DropZone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const [over, setOver] = useState(false);

  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setOver(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) setOver(false);
    };
    const overFn = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setOver(false);
      const files = [...(e.dataTransfer?.files ?? [])];
      if (files.length) onFiles(files);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", overFn);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", overFn);
      window.removeEventListener("drop", drop);
    };
  }, [onFiles]);

  return (
    <AnimatePresence>
      {over && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-background/90 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.18, ease: easeOut } }}
          exit={{ opacity: 0, transition: { duration: 0.12, ease: easeOut } }}
        >
          <motion.div
            className="flex size-full items-center justify-center rounded-[24px] border-2 border-dashed border-line-strong"
            initial={{ scale: 0.98, filter: "blur(4px)" }}
            animate={{ scale: 1, filter: "blur(0px)", transition: { duration: 0.22, ease: easeOut } }}
          >
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-[17px] font-medium text-fg">Drop to attach</p>
              <p className="text-[13px] text-fg-4">Images, PDF, Markdown, text, CSV or JSON. It all stays in context.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

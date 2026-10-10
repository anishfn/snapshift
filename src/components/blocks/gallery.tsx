"use client";

import { useContext, useState } from "react";
import { DocViewerContext } from "@/components/viewer/doc-panel";
import { NoteIcon } from "@/components/icons";
import type { GalleryData } from "@/lib/blocks";
import { Arrive, ArtifactImage, Bar, type BlockProps, Lightbox, useArtifact } from "./shared";

// What's already in the conversation, as a grid. Images open full size and page with the arrow keys; files show
// as a tile with their name.

function Tile({ item, onOpen }: { item: NonNullable<BlockProps<GalleryData>["data"]["items"]>[number]; onOpen: () => void }) {
  const a = useArtifact(item?.artifact || undefined);
  const viewer = useContext(DocViewerContext);
  return (
    <Arrive className="flex flex-col gap-2 pb-2">
      {a?.kind === "doc" ? (
        <button
          type="button"
          onClick={() => viewer.open(a.id)}
          aria-label={`Open ${a.name}`}
          className="focus-ring flex aspect-[40/21] flex-col items-center justify-center gap-1.5 rounded-[12px] bg-surface text-fg-4 transition-colors hover:bg-surface-hover hover:text-fg-2"
        >
          <NoteIcon size={22} />
          <span className="max-w-[80%] truncate text-[12px]">{a.name}</span>
        </button>
      ) : (
        <button type="button" onClick={onOpen} className="focus-ring group overflow-hidden rounded-[12px]" aria-label={`Open ${item?.title ?? "image"}`}>
          <ArtifactImage id={item?.artifact || undefined} className="transition-transform duration-300 ease-out group-hover:scale-[1.02]" />
        </button>
      )}
      <div className="flex flex-col gap-0.5 px-2">
        <h3 className="text-[13px] font-medium text-fg">{item?.title}</h3>
        {item?.caption && <p className="text-[12px] leading-snug text-pretty text-fg-4">{item.caption}</p>}
      </div>
    </Arrive>
  );
}

export function Gallery({ data }: BlockProps<GalleryData>) {
  const items = data.items ?? [];
  const [open, setOpen] = useState<number | null>(null);
  const images = items.map((i) => i?.artifact).filter((a): a is string => !!a);
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {items.map((item, i) => (
        <Tile key={i} item={item} onOpen={() => setOpen(item?.artifact ? images.indexOf(item.artifact) : null)} />
      ))}
      <Lightbox ids={images} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
    </div>
  );
}

export function GallerySkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex flex-col gap-2 pb-2">
          <div className="skeleton aspect-[40/21] rounded-[12px]" />
          <div className="flex flex-col gap-1.5 px-2">
            <Bar className="h-3 w-1/2" />
            <Bar className="h-2.5 w-4/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

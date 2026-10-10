"use client";

import Link from "next/link";
import { useState } from "react";
import { ArtifactsContext, Block, ChatActionsContext } from "@/components/blocks";
import { ChevronLeftIcon } from "@/components/icons";
import { Prose } from "@/components/prose";
import { type BlockId, blockIds, blocks } from "@/lib/blocks";
import { extraSamples, samples } from "@/lib/samples";
import type { Artifact } from "@/lib/types";

// Every component Snap can pick, with what it's told about each and a working example: tick, sort, answer, edit,
// it all works here as it would in a reply. Examples are samples, shown as samples: no decision line.

const slugs = ["folder-maker", "handdrawn-frames", "dia-gradient", "video-cube", "axolotl-pond", "pixel-art"];
const artifacts: Record<string, Artifact> = Object.fromEntries(
  slugs.map((s, i) => [
    `a${i + 1}`,
    { id: `a${i + 1}`, kind: "image", name: s.replace(/-/g, " "), mediaType: "image/webp", src: `/demo/${s}.webp`, bytes: 0 },
  ]),
);

/** One live example with its own state, as a reply would have. */
function Sample({ id, initial }: { id: BlockId; initial: unknown }) {
  const [data, setData] = useState(initial);
  const [answer, setAnswer] = useState<string>();
  return (
    <ChatActionsContext value={{ send: setAnswer, busy: false, compose: () => {} }}>
      <Block id={id} data={data} settled answer={answer} onChange={setData} />
    </ChatActionsContext>
  );
}

export function Catalog() {
  return (
    <ArtifactsContext value={artifacts}>
      <main className="mx-auto flex w-full max-w-[760px] flex-col gap-14 px-5 pt-8 pb-24">
        <header className="flex flex-col gap-3">
          <Link
            href="/"
            className="focus-ring -ms-1.5 flex h-8 w-fit items-center gap-1 rounded-[10px] ps-1 pe-2.5 text-[13px] text-fg-4 hover:bg-white/[0.05] hover:text-fg"
          >
            <ChevronLeftIcon size={15} />
            Chat
          </Link>
          <h1 className="text-[22px] font-medium tracking-[-0.02em] text-fg">What Snap chooses from</h1>
          <p className="max-w-[60ch] text-[14px] text-pretty text-fg-4">
            Every turn, Snap weighs all {blockIds.length} and picks the one that fits, or up to three when you ask for several things at once. Under each name is exactly what Snap is told about it. Each example
            works: try them.
          </p>
          <nav aria-label="Components" className="flex flex-wrap gap-1 pt-1">
            {blockIds.map((id) => (
              <a key={id} href={`#${id}`} className="focus-ring h-7 rounded-[8px] bg-surface px-2 text-[12px] leading-7 text-fg-3 hover:bg-surface-hover hover:text-fg">
                {blocks[id].label}
              </a>
            ))}
          </nav>
        </header>
        {blockIds.map((id, i) => (
          <section key={id} id={id} className="flex scroll-mt-6 flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-[15px] font-medium text-fg">
                <span className="text-fg-5 tabular-nums">{i + 1}.</span> {blocks[id].label}
              </h2>
              <p className="text-[13px] text-pretty text-fg-4">{blocks[id].snap}</p>
            </div>
            {id === "text" ? (
              <Prose text="Plain prose when structure wouldn't help: a short answer, an opinion, an explanation. **Bold**, `code` and simple lists are all it needs." />
            ) : (
              <Sample id={id} initial={samples[id]} />
            )}
            {extraSamples
              .filter((e) => e.id === id)
              .map((e) => (
                <div key={e.title} className="flex flex-col gap-2 pt-3">
                  <p className="text-[12px] text-fg-5">{e.title}</p>
                  <Sample id={e.id} initial={e.data} />
                </div>
              ))}
          </section>
        ))}
      </main>
    </ArtifactsContext>
  );
}

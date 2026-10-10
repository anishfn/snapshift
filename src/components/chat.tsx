"use client";

import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { PlusIcon, SidebarIcon, SparkleIcon } from "@/components/icons";
import { codebaseConversation, demoConversation, suggestions as demoSuggestions, supportConversation } from "@/lib/demo/seed";
import { readFile, TEXT_TYPES } from "@/lib/files";
import { MAX_FILES, tokensOf } from "@/lib/sources";
import type { Artifact } from "@/lib/types";
import { easeOut, press, riseIn } from "@/lib/motion";
import { empty, useChat } from "@/lib/use-chat";
import { ArtifactsContext, ChatActionsContext } from "./blocks";
import { Composer } from "./composer";
import { SourceDialog, type Incoming, type SourceKind } from "./sources/source-dialog";
import { CONTEXT_BUDGET, ContextMeter } from "./context-meter";
import { DropZone } from "./drop-zone";
import { AssistantMessage, UserMessage } from "./message";
import { SIDEBAR_WIDTH, Sidebar, useWide } from "./sidebar";
import { DocPanel, DocViewerContext, panelDefault } from "./viewer/doc-panel";

const fade = {
  initial: { opacity: 0, filter: "blur(4px)" },
  animate: { opacity: 1, filter: "blur(0px)", transition: { duration: 0.25, ease: easeOut } },
  exit: { opacity: 0, filter: "blur(4px)", transition: { duration: 0.12, ease: easeOut } },
};

const nearBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;

export function Chat() {
  const chat = useChat();
  const { conv, loaded, busy } = chat;
  const [attached, setAttached] = useState<string[]>([]);
  const [source, setSource] = useState<SourceKind | null>(null);
  // closing it leaves you in the message box: with a repository added, the next thing is the question
  const closeSource = useCallback(() => {
    setSource(null);
    requestAnimationFrame(() => document.getElementById("composer")?.focus());
  }, []);
  const [notice, setNotice] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  // A new session (demo, new chat, restore) renders in place; only messages added after that rise in.
  const [session, setSession] = useState(0);
  const pinned = useRef(true);
  // The sidebar stays open beside the chat on a wide screen and is a closed drawer on a phone.
  const wide = useWide();
  const [docked, setDocked] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const sidebarOpen = wide ? docked : drawer;
  const closeSidebar = useCallback(() => (wide ? setDocked(false) : setDrawer(false)), [wide]);
  const openSidebar = () => (wide ? setDocked(true) : setDrawer(true));

  // The document panel on the right: which artifact is open, how wide the reader has made it, and who opened it
  // (focus goes back there on close).
  const [docId, setDocId] = useState<string | null>(null);
  const [docWidth, setDocWidth] = useState(0);
  const [resizing, setResizing] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const openDoc = useCallback((id: string) => {
    opener.current = document.activeElement as HTMLElement | null;
    setDocWidth((w) => w || panelDefault());
    setDocId(id);
  }, []);
  const closeDoc = useCallback(() => {
    setDocId(null);
    requestAnimationFrame(() => opener.current?.focus({ preventScroll: true }));
  }, []);

  const replace = (next: typeof conv) => {
    setDocId(null);
    chat.replace(next);
    setAttached([]);
    setSession((s) => s + 1);
    setDrawer(false);
    pinned.current = true;
  };
  const newChat = () => replace(empty());
  const openDemo = async () => replace(await demoConversation());
  const openCodebase = async () => replace(await codebaseConversation());
  const openSupport = async () => replace(await supportConversation());
  const openSaved = async (id: string) => {
    if (id === conv.id) return setDrawer(false);
    setDocId(null);
    await chat.open(id);
    setAttached([]);
    setSession((s) => s + 1);
    setDrawer(false);
    pinned.current = true;
  };

  useEffect(() => {
    const onScroll = () => {
      pinned.current = nearBottom();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Follow the reply as it grows, unless the reader has scrolled up.
  const last = conv.messages[conv.messages.length - 1];
  useLayoutEffect(() => {
    if (pinned.current) window.scrollTo({ top: document.documentElement.scrollHeight });
  }, [session, conv.messages.length, last?.text, last?.data, last?.turn?.status]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const { attach, artifactId } = chat;
  const onFiles = useCallback(
    async (files: File[]) => {
      const first = Number(artifactId().slice(1));
      const results = await Promise.all(files.map((f, i) => readFile(f, `a${first + i}`)));
      for (const r of results) {
        if ("error" in r) setNotice(r.error);
        else {
          setAttached((a) => [...a, r.id]);
          attach(r, "");
        }
      }
    },
    [attach, artifactId],
  );

  /** A repository's files, or a web page, arriving from the dialog: documents, waiting in the composer. */
  const addSource = useCallback(
    (incoming: Incoming) => {
      const first = Number(artifactId().slice(1));
      const made = incoming.files.map((f, i): Artifact => {
        const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
        const mediaType = incoming.source.kind === "page" ? "text/markdown" : (TEXT_TYPES[ext] ?? "text/plain");
        return { id: `a${first + i}`, kind: "doc", name: f.name, mediaType, text: f.text, bytes: f.text.length, source: incoming.source };
      });
      made.forEach((a) => attach(a, ""));
      setAttached((a) => [...a, ...made.map((m) => m.id)]);
    },
    [attach, artifactId],
  );

  /** Puts text in the composer and the cursor after it (Options' "Something else…"). */
  const compose = (text: string) => {
    setDraft(text);
    requestAnimationFrame(() => {
      const field = document.getElementById("composer") as HTMLTextAreaElement | null;
      field?.focus();
      field?.setSelectionRange(text.length, text.length);
    });
  };

  const send = (text: string) => {
    pinned.current = true;
    chat.send(text, attached);
    setAttached([]);
  };

  const recall = (id: string) => {
    document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlash(id);
    setTimeout(() => setFlash((f) => (f === id ? null : f)), 1800);
  };

  const asked = new Set(conv.messages.map((m) => m.text));
  const isDemo = conv.messages.some((m) => m.seeded);
  const suggestions = (conv.suggestions ?? (isDemo ? demoSuggestions : [])).filter((s) => !asked.has(s));
  const lastSeeded = conv.messages.findLastIndex((m) => m.seeded);
  const indexOf = new Map(conv.messages.map((m, i) => [m.id, i]));
  const isEmpty = loaded && !conv.messages.length;

  const composer = (
    // One composer that glides from the middle of an empty chat down to its place under the thread.
    <motion.div layoutId="composer" transition={{ duration: 0.45, ease: easeOut }} className="relative flex flex-col gap-2">
      <AnimatePresence>
        {notice && (
          <motion.p {...fade} role="status" className="px-1 text-[13px] text-fg-3">
            {notice}
          </motion.p>
        )}
      </AnimatePresence>
      <Composer
        text={draft}
        onText={setDraft}
        attachments={attached.map((id) => conv.artifacts[id]).filter(Boolean)}
        busy={busy}
        suggestions={busy ? [] : suggestions}
        onSend={send}
        onFiles={onFiles}
        onSource={setSource}
        onRemove={(id) => {
          setAttached((a) => a.filter((x) => x !== id));
          chat.detach(id);
        }}
      />
    </motion.div>
  );

  return (
    <ArtifactsContext value={conv.artifacts}>
      <ChatActionsContext value={{ send, busy, compose }}>
      <DocViewerContext value={{ open: openDoc, openId: docId }}>
      <Sidebar
        open={sidebarOpen}
        onClose={closeSidebar}
        list={chat.list}
        activeId={conv.id}
        onSelect={openSaved}
        onNew={newChat}
        onDemo={openDemo}
        onCodebase={openCodebase}
        onSupport={openSupport}
        onDelete={chat.remove}
        instant={!loaded}
      />
      {/* With the sidebar closed, its controls wait at the window's edge, where it folds away to. */}
      <AnimatePresence initial={false}>
        {loaded && !sidebarOpen && (
          <motion.div {...fade} className="fixed top-5 left-4 z-40 flex h-9 items-center gap-0.5 rounded-[12px] bg-control p-[3px]">
            <motion.button
              type="button"
              whileTap={press}
              onClick={openSidebar}
              aria-label="Open the sidebar"
              className="focus-ring flex size-[30px] items-center justify-center rounded-[9px] text-fg-2 hover:bg-white/[0.08] hover:text-fg"
            >
              <SidebarIcon size={17} />
            </motion.button>
            <motion.button
              type="button"
              whileTap={press}
              onClick={newChat}
              aria-label="New chat"
              className="focus-ring flex size-[30px] items-center justify-center rounded-[9px] text-fg-2 hover:bg-white/[0.08] hover:text-fg"
            >
              <PlusIcon size={16} />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
      <div
        className={`flex min-h-dvh flex-col ${loaded && !resizing ? "transition-[padding] duration-300 ease-out" : ""}`}
        style={{ paddingInlineStart: wide && docked ? SIDEBAR_WIDTH : 0, paddingInlineEnd: wide && docId ? docWidth : 0 }}
      >
        {/* Sticky so the sidebar and the meter stay in reach in a long chat; a solid fade, never a backdrop blur. */}
        <header
          className={`sticky top-0 z-30 mx-auto flex h-[76px] w-full max-w-[760px] items-center justify-between gap-3 bg-linear-to-b from-background via-background via-70% to-background/0 px-5 ${
            sidebarOpen ? "" : "max-[1100px]:ps-[104px]"
          }`}
        >
          <div className="flex min-w-0 items-center gap-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {conv.messages.length > 0 && (
                <motion.h1 key={conv.id} {...fade} className="truncate text-[15px] text-fg">
                  {conv.title}
                </motion.h1>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence initial={false}>
            {conv.messages.length > 0 && (
              <motion.div {...fade} className="shrink-0">
                <ContextMeter conv={conv} tokens={chat.tokens} measured={chat.measured} />
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {isEmpty ? (
          <main className="mx-auto flex w-full max-w-[680px] flex-1 flex-col justify-center gap-6 px-5 pb-[12vh]">
            <motion.div {...riseIn()} className="flex flex-col items-center gap-1.5 text-center">
              <h1 className="text-[22px] font-medium tracking-[-0.02em] text-fg">Ask anything.</h1>
              <p className="text-[14px] text-pretty text-fg-4">Snap keeps all of it in context and picks how each answer looks.</p>
            </motion.div>
            {composer}
            <motion.div {...riseIn(0.08)} className="flex justify-center">
              <motion.button
                type="button"
                whileTap={press}
                onClick={openDemo}
                className="focus-ring flex h-8 items-center gap-1.5 rounded-[10px] px-2.5 text-[13px] text-fg-4 hover:bg-white/[0.05] hover:text-fg"
              >
                <SparkleIcon size={14} />
                Try the demo conversation
              </motion.button>
            </motion.div>
          </main>
        ) : (
          <>
            <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col px-5">
              {/* Mounted once storage has answered, so a restored conversation is simply there. */}
              {loaded && (
                <ol key={session} className="flex flex-col gap-7 pt-2 pb-6">
                  <AnimatePresence initial={false}>
                    {conv.messages.map((m, i) => (
                      <motion.li
                        key={m.id}
                        id={`msg-${m.id}`}
                        {...riseIn()}
                        // Each message is its own stacking context (its blur), so one with an open popover is lifted above the rest.
                        className={`group/msg relative -mx-3 scroll-mt-24 rounded-[20px] px-3 py-1.5 transition-colors duration-700 has-[[aria-expanded=true]]:z-40 ${flash === m.id ? "bg-white/[0.05]" : ""}`}
                      >
                        {m.role === "user" ? (
                          <UserMessage message={m} artifacts={conv.artifacts} />
                        ) : (
                          <AssistantMessage
                            message={m}
                            recallNumber={m.turn?.decision?.recall ? (indexOf.get(m.turn.decision.recall) ?? -2) + 1 : undefined}
                            onRecall={recall}
                            onRetry={chat.retry}
                            onData={chat.setData}
                            busy={busy}
                            answer={conv.messages[i + 1]?.role === "user" ? conv.messages[i + 1].text : undefined}
                          />
                        )}
                        {i === lastSeeded && (
                          <p className="mt-7 flex items-center gap-3 text-[12px] text-fg-5">
                            <span className="h-px flex-1 bg-line" />
                            Demo history above, written by hand. Snap takes it from here.
                            <span className="h-px flex-1 bg-line" />
                          </p>
                        )}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ol>
              )}
            </main>
            {loaded && (
              <div className="sticky bottom-0 z-30 mx-auto w-full max-w-[760px] px-5 pb-4">
                <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-8 bottom-0 bg-linear-to-b from-background/0 via-background via-35% to-background" />
                {composer}
              </div>
            )}
          </>
        )}
        <DropZone onFiles={onFiles} />
      </div>
      <DocPanel
        artifact={docId ? (conv.artifacts[docId] ?? null) : null}
        wide={wide}
        width={docWidth}
        onWidth={setDocWidth}
        onClose={closeDoc}
        onResizing={setResizing}
      />
      </DocViewerContext>
      </ChatActionsContext>
      <SourceDialog
        open={source}
        onClose={closeSource}
        onAdd={addSource}
        // what's free: Snap's context, less this chat, less what's already waiting in the composer
        freeTokens={CONTEXT_BUDGET - chat.tokens - tokensOf(attached.reduce((n, id) => n + (conv.artifacts[id]?.text?.length ?? 0), 0)) - 6000}
        freeFiles={MAX_FILES - Object.keys(conv.artifacts).length}
      />
    </ArtifactsContext>
  );
}

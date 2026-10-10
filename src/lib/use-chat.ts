"use client";

import { del, get, set } from "idb-keyval";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { estimateTokens, imagePayload, pickImages } from "./files";
import type { Artifact, Conversation, Decision, ImageTags, Message, Summary, TurnEvent, TurnRequest } from "./types";

// Every conversation is kept whole in IndexedDB under its own key; a small index lists them for the sidebar
// and remembers which one was open.

const INDEX_KEY = "snap-chat:index";
const convKey = (id: string) => `snap-chat:conv:${id}`;

type Index = { active: string | null; list: Summary[] };

export const empty = (): Conversation => ({ id: "", updatedAt: 0, title: "New conversation", messages: [], artifacts: {} });

type Action =
  | { type: "replace"; conv: Conversation }
  | { type: "attach"; artifact: Artifact }
  | { type: "detach"; id: string }
  | { type: "tag"; id: string; tags: ImageTags }
  | { type: "ask"; user: Message; assistant: Message; convId: string }
  | { type: "decision"; id: string; decision: Decision }
  | { type: "partial"; id: string; text: string; data?: unknown; extras?: unknown[] }
  | { type: "done"; id: string; text: string; data?: unknown; extras?: unknown[]; writeMs: number; writer?: string }
  | { type: "error"; id: string; message: string }
  | { type: "retry"; id: string }
  | { type: "data"; id: string; data: unknown; extra?: number };

/** The extra components' data as it streams in, each keeping what it had until more arrives. */
const fill = (m: Message, extras?: unknown[]) => m.extras?.map((e, i) => ({ ...e, data: extras?.[i] ?? e.data }));

function update(conv: Conversation, id: string, fn: (m: Message) => Message): Conversation {
  return { ...conv, messages: conv.messages.map((m) => (m.id === id ? fn(m) : m)) };
}

function reducer(conv: Conversation, action: Action): Conversation {
  switch (action.type) {
    case "replace":
      return action.conv;
    case "attach":
      return { ...conv, artifacts: { ...conv.artifacts, [action.artifact.id]: action.artifact } };
    case "detach": {
      const { [action.id]: _, ...rest } = conv.artifacts;
      return { ...conv, artifacts: rest };
    }
    case "tag": {
      const a = conv.artifacts[action.id];
      return a ? { ...conv, artifacts: { ...conv.artifacts, [a.id]: { ...a, tags: action.tags } } } : conv;
    }
    case "ask":
      return {
        ...conv,
        id: conv.id || action.convId,
        updatedAt: action.user.at,
        title: conv.messages.length ? conv.title : titleFrom(action.user.text),
        messages: [...conv.messages, action.user, action.assistant],
      };
    case "decision":
      return {
        ...update(conv, action.id, (m) => ({
          ...m,
          component: action.decision.component,
          ...(action.decision.extras?.length && { extras: action.decision.extras.map((component) => ({ component })) }),
          turn: { ...m.turn, status: "writing", decision: action.decision },
        })),
        lastInputTokens: action.decision.inputTokens,
      };
    case "partial":
      return update(conv, action.id, (m) => ({ ...m, text: action.text, data: action.data ?? m.data, extras: fill(m, action.extras) }));
    case "done":
      return update(conv, action.id, (m) => ({
        ...m,
        text: action.text,
        data: action.data ?? m.data,
        extras: fill(m, action.extras),
        turn: { ...m.turn, status: "done", writeMs: action.writeMs, writer: action.writer },
      }));
    case "error":
      return update(conv, action.id, (m) => ({ ...m, turn: { ...m.turn, status: "error", error: action.message } }));
    case "data":
      return update(conv, action.id, (m) =>
        action.extra == null ? { ...m, data: action.data } : { ...m, extras: m.extras?.map((e, i) => (i === action.extra ? { ...e, data: action.data } : e)) },
      );
    case "retry":
      return update(conv, action.id, (m) => ({ ...m, text: "", data: undefined, component: undefined, extras: undefined, turn: { status: "deciding" } }));
  }
}

/** The first line of the first message, cut at a word near 40 characters. */
function titleFrom(text: string) {
  const line = text.trim().split("\n")[0] || "Images and files";
  if (line.length <= 42) return line;
  const cut = line.slice(0, 42);
  return `${cut.slice(0, cut.lastIndexOf(" ") > 20 ? cut.lastIndexOf(" ") : 42).trimEnd()}…`;
}

const nextId = (prefix: string, taken: Iterable<string>) => {
  let n = 0;
  for (const id of taken) n = Math.max(n, Number(id.slice(prefix.length)) || 0);
  return `${prefix}${n + 1}`;
};

/** A turn cut off by a reload or a switch can't resume: settle it as an error. */
const settle = (conv: Conversation): Conversation => ({
  ...conv,
  messages: conv.messages.map((m) =>
    m.turn && (m.turn.status === "deciding" || m.turn.status === "writing")
      ? { ...m, turn: { ...m.turn, status: "error" as const, error: "Stopped before it finished." } }
      : m,
  ),
});

export function useChat() {
  const [conv, dispatch] = useReducer(reducer, undefined, empty);
  const [list, setList] = useState<Summary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const abort = useRef<AbortController | null>(null);

  // Restore the history and the conversation that was open.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const index = await get<Index>(INDEX_KEY);
        if (!live || !index) return;
        setList(index.list);
        const saved = index.active ? await get<Conversation>(convKey(index.active)) : undefined;
        if (live && saved) dispatch({ type: "replace", conv: settle(saved) });
      } catch {}
    })().finally(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, []);

  // Keep the open conversation saved and its line in the history current.
  useEffect(() => {
    if (!loaded || !conv.id || !conv.messages.length) return;
    const t = setTimeout(() => {
      set(convKey(conv.id), conv).catch(() => {});
      setList((l) => {
        const entry: Summary = { id: conv.id, title: conv.title, updatedAt: conv.updatedAt, demo: conv.messages.some((m) => m.seeded) };
        const same = l.find((x) => x.id === conv.id);
        if (same && same.title === entry.title && same.updatedAt === entry.updatedAt) return l;
        return [entry, ...l.filter((x) => x.id !== conv.id)];
      });
    }, 300);
    return () => clearTimeout(t);
  }, [conv, loaded]);

  useEffect(() => {
    if (!loaded) return;
    set(INDEX_KEY, { active: conv.id || null, list } satisfies Index).catch(() => {});
  }, [list, conv.id, loaded]);

  const busy = conv.messages.some((m) => m.turn && (m.turn.status === "deciding" || m.turn.status === "writing"));

  const replace = useCallback((next: Conversation) => {
    abort.current?.abort();
    dispatch({ type: "replace", conv: next });
  }, []);

  /** Opens a conversation from the history. */
  const open = useCallback(
    async (id: string) => {
      const saved = await get<Conversation>(convKey(id)).catch(() => undefined);
      if (saved) replace(settle(saved));
      else setList((l) => l.filter((x) => x.id !== id));
    },
    [replace],
  );

  /** Deletes a conversation for good. Deleting the open one starts a new chat. */
  const remove = useCallback(
    (id: string) => {
      del(convKey(id)).catch(() => {});
      setList((l) => l.filter((x) => x.id !== id));
      if (id === conv.id) replace(empty());
    },
    [conv.id, replace],
  );

  const attach = useCallback(
    async (artifact: Artifact, note: string) => {
      dispatch({ type: "attach", artifact });
      if (artifact.kind !== "image") return;
      try {
        const res = await fetch("/api/describe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: artifact.name, note, ...(await imagePayload(artifact)) }),
        });
        if (res.ok) dispatch({ type: "tag", id: artifact.id, tags: await res.json() });
      } catch {}
    },
    [],
  );

  const detach = useCallback((id: string) => dispatch({ type: "detach", id }), []);

  /** Keeps what the reader did inside a block (ticks, answers, edits) with the conversation. */
  const setData = useCallback((id: string, data: unknown, extra?: number) => dispatch({ type: "data", id, data, extra }), []);

  const artifactId = () => nextId("a", Object.keys(conv.artifacts));

  function send(text: string, attached: string[]) {
    const ids = conv.messages.map((m) => m.id);
    const user: Message = { id: nextId("m", ids), role: "user", text, at: Date.now(), ...(attached.length && { artifacts: attached }) };
    const assistant: Message = { id: nextId("m", [...ids, user.id]), role: "assistant", text: "", at: Date.now(), turn: { status: "deciding" } };
    dispatch({ type: "ask", user, assistant, convId: conv.id || crypto.randomUUID() });
    run(conv.messages, user, assistant.id);
  }

  /** Runs a failed turn again in place. */
  function retry(assistantId: string) {
    const i = conv.messages.findIndex((m) => m.id === assistantId);
    const user = conv.messages[i - 1];
    if (i < 1 || user.role !== "user") return;
    dispatch({ type: "retry", id: assistantId });
    run(conv.messages.slice(0, i - 1), user, assistantId);
  }

  async function run(before: Message[], user: Message, assistantId: string) {
    // Failed or unfinished turns stay on screen but out of the context.
    const messages = [...before.filter((m) => !m.turn || m.turn.status === "done"), user];
    const referenced = new Set(messages.flatMap((m) => m.artifacts ?? []));
    const artifacts = Object.values(conv.artifacts)
      .filter((a) => referenced.has(a.id))
      .map(({ src: _, ...a }) => a);

    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    const fail = (message: string) => dispatch({ type: "error", id: assistantId, message });

    try {
      const images = await Promise.all(pickImages(conv, user.artifacts ?? []).map(imagePayload));
      const body: TurnRequest = {
        messages: messages.map(({ id, role, text, at, artifacts, component, data, extras }) => ({ id, role, text, at, artifacts, component, data, extras })),
        artifacts,
        images,
      };
      const res = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        fail(res.status === 413 ? "That's more than one request can carry. Try fewer or smaller files." : `The app's server returned ${res.status}.`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finished = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line) continue;
          const event = JSON.parse(line) as TurnEvent;
          if (event.type === "decision") dispatch({ type: "decision", id: assistantId, decision: event.decision });
          else if (event.type === "partial") dispatch({ type: "partial", id: assistantId, text: event.text, data: event.data, extras: event.extras });
          else if (event.type === "done") {
            finished = true;
            dispatch({ type: "done", id: assistantId, text: event.text, data: event.data, extras: event.extras, writeMs: event.writeMs, writer: event.writer });
          } else if (event.type === "error") {
            finished = true;
            fail(event.message);
          }
        }
      }
      if (!finished) fail("The reply stopped partway. Try again.");
    } catch {
      if (!controller.signal.aborted) fail("Couldn't reach the app's server. Check that it's running.");
    }
  }

  const tokens = conv.lastInputTokens ?? estimateTokens(conv);
  const measured = conv.lastInputTokens != null;

  return { conv, list, loaded, busy, send, retry, attach, detach, setData, replace, open, remove, artifactId, tokens, measured };
}

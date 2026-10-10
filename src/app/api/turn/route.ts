import { parsePartialJson } from "ai";
import { decideTurn } from "@/lib/decide";
import { withPdfText } from "@/lib/pdf";
import { extraKey, replySchema, writerMessages } from "@/lib/prompt";
import { SubqError, write, writer } from "@/lib/subq";
import type { TurnEvent, TurnRequest } from "@/lib/types";

// One turn, streamed as NDJSON: Snap's decision the moment it lands, then the writer's reply as it grows.

const PARTIAL_EVERY_MS = 50;

/**
 * House style, enforced rather than hoped for: no em dashes in anything the writer produces (prose or the
 * component's strings). "a — b" and "a—b" both become "a, b"; a number range keeps a hyphen.
 */
function tidy<T>(value: T): T {
  if (typeof value === "string")
    return value
      .replace(/(\d)\s*[—–]\s*(\d)/g, "$1-$2") // ranges keep a plain hyphen: 2019-2020
      .replace(/\s*[—–]\s*/g, ", ")
      .replace(/^\s+/, "") as T;
  if (Array.isArray(value)) return value.map(tidy) as T;
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, tidy(v)])) as T;
  return value;
}

const explain = (e: unknown) => (e instanceof SubqError ? e.message : "Something went wrong talking to SubQ. Try again.");

export async function POST(request: Request) {
  // PDFs are read into text first, so Snap and every writer see them like any other document.
  const req = await withPdfText((await request.json()) as TurnRequest);
  const signal = request.signal;
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: TurnEvent) => {
        if (!signal.aborted) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      const fail = (stage: "decide" | "write", e: unknown) => {
        if (signal.aborted) return;
        console.error(e);
        send({ type: "error", stage, message: explain(e) });
      };

      let decision;
      try {
        decision = await decideTurn(req, signal);
        send({ type: "decision", decision });
      } catch (e) {
        fail("decide", e);
        controller.close();
        return;
      }

      const schema = replySchema(decision);
      const shape = async (raw: string) => {
        if (!schema) return { text: tidy(raw) };
        const { value } = await parsePartialJson(raw);
        const v = (value ?? {}) as { text?: string; data?: unknown } & Record<string, unknown>;
        const extras = decision.extras?.length ? decision.extras.map((id) => tidy(v[extraKey(id)])) : undefined;
        return { text: tidy(v.text ?? ""), data: tidy(v.data), ...(extras && { extras }) };
      };

      const started = performance.now();
      let last = 0;
      // Partials are parsed one after another so they reach the browser in order.
      let queue = Promise.resolve();
      try {
        const raw = await write({
          messages: writerMessages(req, decision, writer()),
          schema,
          signal,
          onText: (soFar) => {
            const now = performance.now();
            if (now - last < PARTIAL_EVERY_MS) return;
            last = now;
            queue = queue.then(async () => send({ type: "partial", ...(await shape(soFar)) }));
          },
        });
        await queue;
        send({ type: "done", ...(await shape(raw)), writeMs: Math.round(performance.now() - started), writer: writer().model });
      } catch (e) {
        fail("write", e);
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}

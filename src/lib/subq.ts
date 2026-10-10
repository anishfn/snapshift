import "server-only";

// The two models, over plain fetch. Snap lives on SubQ's Decisions API (its own typed contract). The writer speaks
// OpenAI-compatible Chat Completions: a free OpenRouter model while subq-preview is in early access (it sees images
// too), or subq-preview itself with WRITER=subq. Docs: https://docs.subq.ai, https://openrouter.ai/docs

// SUBQ_BASE_URL is only for pointing at a local stand-in while testing.
const BASE = process.env.SUBQ_BASE_URL ?? "https://api.subq.ai/v1";
export const SNAP = "subq-snap-preview";

/** Who writes the reply, and what it can take in. */
export type Writer = {
  name: "openrouter" | "subq";
  label: string;
  base: string;
  model: string;
  /** Models to fall back to, in order, when the first is busy (OpenRouter routes these itself). */
  fallbacks?: string[];
  envKey: string;
  vision: boolean;
  docs: "file" | "text";
};

export function writer(): Writer {
  const choice = process.env.WRITER ?? (process.env.OPENROUTER_API_KEY ? "openrouter" : "subq");
  if (choice === "openrouter") {
    return {
      name: "openrouter",
      label: "OpenRouter",
      base: "https://openrouter.ai/api/v1",
      // Free models with JSON-schema output, measured on the 30k-token demo's launch checklist: dots 3 note was
      // right (3 of 6 done) in 5s and takes images; Nemotron 3 Super answered in 6.5s but only listed what was left.
      model: process.env.OPENROUTER_MODEL ?? "dots-studio/dots-3-note-preview:free",
      fallbacks: ["nvidia/nemotron-3-super-120b-a12b:free"],
      envKey: "OPENROUTER_API_KEY",
      vision: true,
      docs: "text",
    };
  }
  return { name: "subq", label: "SubQ", base: BASE, model: "subq-preview", envKey: "SUBQ_API_KEY", vision: false, docs: "file" };
}

export class SubqError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function key(env = "SUBQ_API_KEY") {
  const k = process.env[env];
  if (!k) throw new SubqError(`Add ${env} to .env.local, then restart the server.`, 0);
  return k;
}

const headers = (env?: string) => ({ Authorization: `Bearer ${key(env)}`, "Content-Type": "application/json" });

/** The useful part of a provider's raw error, which is often JSON inside a string. */
function providerReason(raw: unknown): string {
  if (typeof raw !== "string") return "";
  try {
    const j = JSON.parse(raw);
    const m = j?.error?.message ?? j?.message ?? j?.detail ?? "";
    return typeof m === "string" ? m.slice(0, 220) : "";
  } catch {
    return raw.slice(0, 220);
  }
}

/** One plain sentence per failure, with what to do about it. */
async function fail(res: Response, model: string, who: { label: string; envKey: string } = { label: "SubQ", envKey: "SUBQ_API_KEY" }): Promise<never> {
  let detail = "";
  try {
    const body = await res.json();
    detail = body?.detail?.message ?? body?.error?.message ?? body?.[0]?.error?.message ?? "";
    // OpenRouter wraps the provider's own reason in metadata.raw; "Provider returned error" alone says nothing.
    const raw = body?.error?.metadata?.raw;
    if (raw) detail = providerReason(raw) || detail;
  } catch {}
  const message =
    {
      401: `${who.label} didn't accept the API key. Check ${who.envKey} in .env.local.`,
      402: `The ${who.label} account is out of credits.`,
      403:
        who.label === "SubQ"
          ? `This key can't use ${model} yet.${model === "subq-preview" ? " It's in early access: request it at console.subq.ai." : ""}`
          : `${who.label} didn't allow this key to use ${model}. Check ${who.envKey}.`,
      429:
        who.label === "OpenRouter"
          ? "OpenRouter's free models are busy, or the free daily limit is used up. Try again shortly, or add credits at openrouter.ai."
          : `${who.label} is rate limiting. Try again in a moment.`,
      503: `${who.label} is briefly unavailable. Try again in a moment.`,
    }[res.status] ?? (detail ? `${who.label} said: ${detail}` : `${who.label} returned ${res.status}.`);
  throw new SubqError(message, res.status);
}

/* ---------- Snap: decisions ---------- */

export type Question =
  | { type: "noul"; instructions: string; criteria?: { true: string; false: string } }
  | { type: "choice"; instructions: string; criteria: Record<string, string | null> }
  | { type: "score"; instructions: string; criteria: string[] };

export type Answer =
  | { type: "noul"; noul: number }
  | { type: "choice"; choice: string; probabilities: Record<string, number>; confidence: number }
  | { type: "score"; score: number; legend: Record<string, string>; probabilities: Record<string, number>; confidence: number };

export type DecideResult = { answers: Record<string, Answer>; usage: { input_tokens: number; output_tokens: number }; ms: number };

export async function decide(input: {
  state: unknown;
  questions: Record<string, Question>;
  images?: { mediaType: string; base64: string }[];
  signal?: AbortSignal;
}): Promise<DecideResult> {
  const started = performance.now();
  const res = await fetch(`${BASE}/systemone`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model: SNAP,
      state: input.state,
      questions: input.questions,
      ...(input.images?.length && { images: input.images }),
    }),
    signal: input.signal,
  });
  if (!res.ok) await fail(res, SNAP);
  const body = await res.json();
  return { answers: body.answers, usage: body.usage, ms: Math.round(performance.now() - started) };
}

/* ---------- Writer: chat completions ---------- */

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "file"; filename: string; mime_type: string; file_data: string }
  | { type: "image_url"; image_url: { url: string } };

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string | ContentPart[] };

/**
 * Streams the writer's reply, calling `onText` with everything so far. With a schema, the reply is JSON.
 * If SubQ won't stream a schema-constrained reply, it asks once more without streaming.
 */
export async function write(input: {
  messages: ChatMessage[];
  schema?: Record<string, unknown>;
  onText: (soFar: string) => void;
  signal?: AbortSignal;
}): Promise<string> {
  const w = writer();
  const body = (stream: boolean) =>
    JSON.stringify({
      model: w.model,
      messages: input.messages,
      stream,
      ...(w.name === "openrouter"
        ? { models: [w.model, ...(w.fallbacks ?? [])], reasoning: { effort: "low" } }
        : // No bounded default: leaving this out lets the model reason at length before a single word arrives.
          { reasoning_effort: "low" }),
      ...(input.schema && {
        response_format: { type: "json_schema", json_schema: { name: "reply", strict: true, schema: input.schema } },
      }),
    });
  const post = (stream: boolean) =>
    fetch(`${w.base}/chat/completions`, {
      method: "POST",
      headers: { ...headers(w.envKey), ...(w.name === "openrouter" && { "X-Title": "snapshift" }) },
      body: body(stream),
      signal: input.signal,
    });

  let res = await post(true);
  // A momentary "busy" from the provider is retried once, quietly, before anyone sees it.
  if (res.status === 503 || res.status === 429) {
    await new Promise((r) => setTimeout(r, 1200));
    res = await post(true);
  }

  if (res.status === 400 && input.schema) {
    res = await post(false);
    if (!res.ok) await fail(res, w.model, w);
    const json = await res.json();
    const content: string = json.choices?.[0]?.message?.content ?? "";
    if (!content) throw new SubqError("The writer used its whole budget thinking and wrote nothing. Try again.", 200);
    input.onText(content);
    return content;
  }
  if (!res.ok || !res.body) await fail(res, w.model, w);

  let text = "";
  let finish: string | null = null;
  let buffer = "";
  const decoder = new TextDecoder();
  const reader = res.body!.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      const event = JSON.parse(data);
      if (event.error) {
        const why = providerReason(event.error.metadata?.raw) || event.error.message || "the stream failed";
        throw new SubqError(`${w.label} said: ${why}`, Number(event.error.code) || 500);
      }
      const choice = event.choices?.[0];
      const delta: string | undefined = choice?.delta?.content;
      if (choice?.finish_reason) finish = choice.finish_reason;
      if (delta) {
        text += delta;
        input.onText(text);
      }
    }
  }
  if (!text && finish === "length") {
    throw new SubqError("The writer used its whole budget thinking and wrote nothing. Try again.", 200);
  }
  return text;
}

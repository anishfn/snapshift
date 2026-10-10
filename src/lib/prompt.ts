import "server-only";
import { blocks, writerRule } from "./blocks";
import type { ChatMessage, ContentPart, Writer } from "./subq";
import type { Decision, TurnRequest } from "./types";

// The writer gets the whole conversation as it happened and Snap's decision. Documents are different: Snap has
// read every one of them, and the writer gets only those Snap picked for this reply plus any attached to the newest
// message (file parts for SubQ, their text for the others). That is what lets a chat hold hundreds of thousands of
// tokens of files: the decision model reads them all, the writer reads the two that matter. A writer that can see
// also gets the images Snap looked at this turn; anything else reaches it as Snap's tags and any caption.

const DEPTH = [
  "one line",
  "two or three sentences",
  "a short paragraph or two",
  "as long as it needs, but no padding",
];

const IMAGE_KINDS: Record<string, string> = {
  ui_screenshot: "an interface screenshot",
  chart: "a chart",
  photo: "a photo",
  illustration: "an illustration or render",
  document: "a page or slide",
  diagram: "a diagram",
  other: "an image",
};

function describe(a: TurnRequest["artifacts"][number]) {
  if (a.kind === "doc") return `[the file "${a.name}" (id ${a.id}), attached]`;
  const parts = [`[${a.id}: image "${a.name}"`];
  if (a.caption) parts.push(a.caption);
  if (a.tags) {
    parts.push(
      `Snap says ${IMAGE_KINDS[a.tags.kind] ?? "an image"}, ${a.tags.dark > 0.5 ? "dark" : "light"}${a.tags.hasText > 0.5 ? ", with readable text" : ""}`,
    );
  }
  return `${parts.join(". ")}]`;
}

function base64(text: string) {
  return Buffer.from(text, "utf8").toString("base64");
}

function files(req: TurnRequest, ids: string[] | undefined, docs: Writer["docs"]): ContentPart[] {
  return (ids ?? []).flatMap((id): ContentPart[] => {
    const a = req.artifacts.find((x) => x.id === id);
    if (!a || a.kind !== "doc") return [];
    if (docs === "text") {
      if (a.text != null) return [{ type: "text", text: `The file "${a.name}" (id ${a.id}):\n\n${a.text}` }];
      // PDFs go in as inline data, which Gemini reads
      return a.base64 ? [{ type: "image_url", image_url: { url: `data:${a.mediaType};base64,${a.base64}` } }] : [];
    }
    const data = a.text != null ? base64(a.text) : a.base64;
    if (!data) return [];
    return [{ type: "file", filename: a.name, mime_type: a.mediaType, file_data: data }];
  });
}

export function writerMessages(req: TurnRequest, decision: Decision, w: Pick<Writer, "vision" | "docs">): ChatMessage[] {
  const block = blocks[decision.component];
  const recalled = decision.recall ? req.messages.find((m) => m.id === decision.recall) : undefined;
  const recalledNumber = recalled ? req.messages.indexOf(recalled) + 1 : 0;
  const picked = decision.artifacts.map((id) => req.artifacts.find((a) => a.id === id)).filter(Boolean);
  const extras = decision.extras ?? [];
  const newest = req.messages[req.messages.length - 1];
  // the documents the writer reads: the ones Snap picked, and the ones that just arrived
  const wanted = new Set([...decision.artifacts, ...(newest.artifacts ?? [])]);
  const isDoc = (id: string) => req.artifacts.find((a) => a.id === id)?.kind === "doc";

  const system = [
    "You write replies in a chat. A fast decision model, SubQ Snap, has already read the whole conversation and chosen how this reply is shown. Follow its choice.",
    `Snap chose: ${block.label}. ${block.snap}`,
    block.schema
      ? 'Reply with JSON: "text" is the prose shown above the component, "data" fills the component. Write "text" first.'
      : "Reply in plain prose.",
    writerRule(decision.component) ?? "",
    extras.length
      ? `The user asked for more than one kind of thing, so Snap chose ${extras.length === 1 ? "one more component" : `${extras.length} more components`} for the same reply, shown under the ${block.label}: ${extras
          .map((id) => `"${extraKey(id)}" fills a ${blocks[id].label} (${blocks[id].snap})`)
          .join("; ")}. Fill every one. Each shows a different part of the answer: don't put the same content in two of them, and keep each to what was asked for.`
      : "",
    ...extras.map((id) => writerRule(id) ?? ""),
    `Length of the prose: ${DEPTH[decision.depth] ?? DEPTH[1]}. When there is a component, the prose introduces it and does not repeat it, and every number or count in the prose must match the component's data exactly.`,
    recalled
      ? `Snap found that this reply may depend on message ${recalledNumber}, from the ${recalled.role}: "${recalled.text}". Respect it. Mention it only when it changes the answer, and then say plainly that you're going by it.`
      : "",
    picked.length
      ? `Snap picked these artifacts for this reply, most relevant first: ${picked.map((a) => describe(a!)).join(" ")}. Use their ids exactly where the component asks for an artifact.`
      : "",
    w.vision && req.images.length
      ? `You can see the images attached to the newest message: ${req.images.map((i) => i.id).join(", ")}, each labelled with its id. Describe only what you can actually see in them.`
      : "",
    "In your prose, call a file by its name (src/lib/x.ts), never by its id and never as \"document a21\": ids are only for component fields that ask for an artifact.",
    "When the user asks for a number of things (three questions, five ideas), give exactly that many.",
    "Write plainly: no hype, no em dashes, no headings. Markdown is limited to **bold**, `code` and simple - lists.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const history: ChatMessage[] = req.messages.map((m, i) => {
    const notes = (m.artifacts ?? [])
      .map((id) => req.artifacts.find((a) => a.id === id))
      .filter((a) => a?.kind === "image")
      .map((a) => describe(a!));
    const shown =
      (m.component && m.component !== "text" ? `\n\n(Shown as ${blocks[m.component].label}: ${JSON.stringify(m.data)})` : "") +
      (m.extras ?? []).map((e) => `\n\n(Also shown as ${blocks[e.component].label}: ${JSON.stringify(e.data)})`).join("");
    const docs = (m.artifacts ?? []).filter(isDoc);
    const skipped = docs.filter((id) => !wanted.has(id));
    // What wasn't attached is still named, so the writer knows what exists (a repository's layout, say).
    const names = skipped.map((id) => req.artifacts.find((a) => a.id === id)!.name);
    const listed = names.join(", ").length <= 9000 ? names.join(", ") : `${names.slice(0, 250).join(", ")} and ${names.length - 250} more`;
    const unread = skipped.length
      ? `\n\n(${skipped.length === docs.length ? "" : "Also "}shared here but not attached, because Snap read ${skipped.length === 1 ? "it" : "them"} and judged this reply doesn't need the contents: ${listed}.)`
      : "";
    const text = `${m.text}${notes.length ? `\n\n${notes.join("\n")}` : ""}${unread}${shown}`;
    const attached: ContentPart[] = m.role === "user" ? files(req, m.artifacts?.filter((id) => wanted.has(id)), w.docs) : [];
    // The newest message carries the images Snap looked at, for a writer that can see.
    if (w.vision && i === req.messages.length - 1) {
      for (const img of req.images) {
        attached.push({ type: "text", text: `Image ${img.id}:` }, { type: "image_url", image_url: { url: `data:${img.mediaType};base64,${img.base64}` } });
      }
    }
    const label = `[message ${i + 1}] `;
    return attached.length
      ? { role: m.role, content: [{ type: "text", text: label + text }, ...attached] }
      : { role: m.role, content: m.role === "user" ? label + text : text };
  });

  return [{ role: "system", content: system }, ...history];
}

/** Where an extra component's data goes in the writer's JSON. */
export const extraKey = (id: string) => `data_${id}`;

export function replySchema(decision: Decision) {
  const schema = blocks[decision.component].schema;
  if (!schema) return undefined;
  const extras = (decision.extras ?? []).filter((id) => blocks[id].schema);
  return {
    type: "object",
    properties: { text: { type: "string" }, data: schema, ...Object.fromEntries(extras.map((id) => [extraKey(id), blocks[id].schema])) },
    required: ["text", "data", ...extras.map(extraKey)],
    additionalProperties: false,
  };
}

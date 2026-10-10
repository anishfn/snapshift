import "server-only";
import { extractText, getDocumentProxy } from "unpdf";
import type { TurnRequest } from "./types";

// PDFs become text on the server, page by page, before Snap or the writer see them. Not every writer takes a PDF
// (the free OpenRouter model rejects one outright), and Snap only reads text, so this way the whole PDF is in
// context for both, the same as a Markdown file. Extracted once per file and kept while the server runs.

const MAX_CHARS = 600_000; // about 150k tokens: room left for the conversation in Snap's window
const cache = new Map<string, string>();

async function pdfText(base64: string): Promise<string> {
  const key = `${base64.length}:${base64.slice(0, 48)}:${base64.slice(-48)}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  let text = "";
  try {
    const pdf = await getDocumentProxy(new Uint8Array(Buffer.from(base64, "base64")));
    const { text: pages } = await extractText(pdf, { mergePages: false });
    text = pages
      .map((p, i) => ({ p: p.trim(), i }))
      .filter(({ p }) => p)
      .map(({ p, i }) => `[page ${i + 1}]\n${p}`)
      .join("\n\n");
  } catch {
    text = "";
  }
  const out = text
    ? text.slice(0, MAX_CHARS)
    : "(This PDF has no text that can be read: it is probably a scan or images only. Say so if asked about its contents.)";
  cache.set(key, out);
  return out;
}

/** Fills in the text of every PDF in the turn that doesn't have it yet. */
export async function withPdfText(req: TurnRequest): Promise<TurnRequest> {
  const artifacts = await Promise.all(
    req.artifacts.map(async (a) =>
      a.kind === "doc" && a.mediaType === "application/pdf" && a.text == null && a.base64 ? { ...a, text: await pdfText(a.base64), base64: undefined } : a,
    ),
  );
  return { ...req, artifacts };
}

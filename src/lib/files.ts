import type { Artifact, Conversation } from "./types";

// Files as they come in: images are scaled down in the browser (requests stay small and Snap only needs to see
// them), text documents are read as text so Snap can read them too, PDFs travel as base64 for the writer.

const MAX_SIDE = 1280;
const MAX_DOC_BYTES = 3 * 1024 * 1024;

export const TEXT_TYPES: Record<string, string> = {
  md: "text/markdown",
  markdown: "text/markdown",
  txt: "text/plain",
  csv: "text/csv",
  tsv: "text/tab-separated-values",
  json: "application/json",
  xml: "application/xml",
};

export const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,.pdf,.md,.markdown,.txt,.csv,.tsv,.json,.xml";

async function downscale(file: File): Promise<{ src: string; bytes: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/webp", 0.85),
  );
  return { src: await dataUrl(blob), bytes: blob.size };
}

const dataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/** Turns a dropped or picked file into an artifact, or explains why it can't. */
export async function readFile(file: File, id: string): Promise<Artifact | { error: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (file.type.startsWith("image/")) {
    try {
      const { src, bytes } = await downscale(file);
      return { id, kind: "image", name: file.name, mediaType: "image/webp", src, bytes };
    } catch {
      return { error: `Couldn't read ${file.name} as an image.` };
    }
  }
  if (file.size > MAX_DOC_BYTES) return { error: `${file.name} is over 3 MB. Try a smaller file.` };
  if (ext in TEXT_TYPES) {
    return { id, kind: "doc", name: file.name, mediaType: TEXT_TYPES[ext], text: await file.text(), bytes: file.size };
  }
  if (ext === "pdf") {
    const url = await dataUrl(file);
    return { id, kind: "doc", name: file.name, mediaType: "application/pdf", base64: url.slice(url.indexOf(",") + 1), bytes: file.size };
  }
  return { error: `${file.name} isn't a file this chat reads. Images, PDF, Markdown, text, CSV and JSON work.` };
}

const base64Cache = new Map<string, string>();

/** Plain base64 without the data: prefix, the way Snap wants it. Public paths are fetched once. */
async function toBase64(src: string): Promise<string> {
  if (src.startsWith("data:")) return src.slice(src.indexOf(",") + 1);
  const cached = base64Cache.get(src);
  if (cached) return cached;
  const url = await dataUrl(await (await fetch(src)).blob());
  const b64 = url.slice(url.indexOf(",") + 1);
  base64Cache.set(src, b64);
  return b64;
}

export async function imagePayload(a: Artifact) {
  return { id: a.id, mediaType: a.mediaType, base64: await toBase64(a.src!) };
}

/**
 * Snap looks at up to four images a turn. The rest it knows by name, caption and tags. Pick the ones
 * attached right now, then the ones it chose last time, then the newest.
 */
export function pickImages(conv: Conversation, attached: string[]): Artifact[] {
  const isImage = (id: string) => conv.artifacts[id]?.kind === "image";
  const lastChosen = [...conv.messages].reverse().find((m) => m.turn?.decision?.artifacts.length)?.turn?.decision?.artifacts ?? [];
  const shared = conv.messages.flatMap((m) => m.artifacts ?? []).reverse();
  const order = [...attached, ...lastChosen, ...shared].filter(isImage);
  return [...new Set(order)].slice(0, 4).map((id) => conv.artifacts[id]);
}

/** A rough count for before Snap has measured anything: about four characters a token, ~200 per image. */
export function estimateTokens(conv: Conversation) {
  const used = new Set(conv.messages.flatMap((m) => m.artifacts ?? []));
  let chars = 0;
  for (const m of conv.messages) chars += m.text.length + (m.data ? JSON.stringify(m.data).length : 0);
  let tokens = Math.round(chars / 4);
  for (const id of used) {
    const a = conv.artifacts[id];
    if (!a) continue;
    tokens += a.kind === "image" ? 200 : Math.round((a.text?.length ?? a.bytes / 2) / 4);
  }
  return tokens;
}

import "server-only";
import type { PageResult } from "./sources";

// Reading a web page: fetched here on the server and boiled down to its words. No browser, no scripts run: a page
// that only exists after its JavaScript runs comes back nearly empty, and the dialog says so.

export class PageError extends Error {}

const MAX_CHARS = 400_000;

/** Only public web addresses: nothing on this machine or the local network. */
function allowed(url: URL) {
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  const h = url.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || h === "[::1]") return false;
  if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return false;
  return true;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", mdash: ", ", ndash: "-", hellip: "...", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"' };
const decode = (s: string) =>
  s
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m);

/** HTML down to readable text: headings and list items kept as Markdown, everything else as paragraphs. */
export function htmlToText(html: string) {
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "");
  // the article or main part when the page marks one, so menus and footers stay out
  const body = html.match(/<(article|main)\b[\s\S]*<\/\1>/i)?.[0] ?? html.match(/<body\b[\s\S]*<\/body>/i)?.[0] ?? html;
  const text = decode(
    body
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<(script|style|noscript|svg|nav|footer|header|form|iframe|template)\b[\s\S]*?<\/\1>/gi, "")
      .replace(/<h([1-6])[^>]*>/gi, (_, n) => `\n\n${"#".repeat(Number(n))} `)
      .replace(/<li[^>]*>/gi, "\n- ")
      .replace(/<(br|hr)[^>]*>/gi, "\n")
      .replace(/<\/(p|div|section|article|tr|table|ul|ol|h[1-6]|pre|blockquote)>/gi, "\n\n")
      .replace(/<\/(td|th)>/gi, "  ")
      .replace(/<\/?[a-zA-Z][^>"']*(?:(?:"[^"]*"|'[^']*')[^>"']*)*>/g, ""),
  )
    .replace(/^[ \t]*-[ \t]*$/gm, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { title, text };
}

export async function readPage(input: string, signal?: AbortSignal): Promise<PageResult> {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  } catch {
    throw new PageError("That doesn't look like a web address.");
  }
  if (!allowed(url)) throw new PageError("Only public web pages can be read.");
  let res: Response;
  try {
    res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; snap-chat)", Accept: "text/html,text/plain,text/markdown;q=0.9,*/*;q=0.5" }, redirect: "follow", signal });
  } catch {
    throw new PageError("Couldn't reach that page.");
  }
  if (!res.ok) throw new PageError(`That page returned ${res.status}.`);
  const type = res.headers.get("content-type") ?? "";
  if (!/text\/|json|xml/.test(type)) throw new PageError("That address isn't a page of text.");
  const raw = (await res.text()).slice(0, 3_000_000);
  const { title, text } = /html/.test(type) ? htmlToText(raw) : { title: "", text: raw };
  if (text.length < 200) throw new PageError("That page has almost no text to read. It may need JavaScript to show anything.");
  return { url: res.url || url.href, title: title || url.hostname, text: text.slice(0, MAX_CHARS) };
}

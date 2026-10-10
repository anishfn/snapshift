"use client";

import { Fragment, type ReactNode } from "react";
import { highlight } from "@/components/blocks/simple";

// Text documents as people expect to read them: Markdown formatted, CSV and TSV as a table, JSON indented and
// coloured, anything else as plain text. Small hand-written parsers: nothing here executes the document.

/* ---------- Markdown ---------- */

function inlineMd(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const t = m[0];
    const k = m.index;
    if (t.startsWith("**") || t.startsWith("__")) out.push(<strong key={k} className="font-medium text-fg">{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={k} className="rounded-[5px] bg-control px-1 py-0.5 font-mono text-[0.86em] text-fg">{t.slice(1, -1)}</code>);
    else if (t.startsWith("[")) {
      const [, label, href] = t.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/) ?? [];
      const safe = /^(https?:|mailto:|#|\/)/.test(href ?? "");
      out.push(
        safe ? (
          <a key={k} href={href} target="_blank" rel="noreferrer" className="text-fg underline decoration-fg-6 underline-offset-2 hover:decoration-fg-3">
            {label}
          </a>
        ) : (
          label
        ),
      );
    } else out.push(<em key={k}>{t.slice(1, -1)}</em>);
    last = k + t.length;
  }
  out.push(text.slice(last));
  return out;
}

const cells = (row: string) => row.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());

function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  // front matter is metadata, not reading matter
  if (lines[0] === "---") {
    const end = lines.indexOf("---", 1);
    if (end > 0) i = end + 1;
  }
  while (i < lines.length) {
    const line = lines[i];
    const key = i;
    if (!line.trim()) {
      i++;
      continue;
    }
    const fence = line.match(/^```(\w*)/);
    if (fence) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++]);
      i++;
      out.push(
        <pre key={key} className="overflow-x-auto rounded-[10px] bg-surface p-3 font-mono text-[12.5px] leading-relaxed text-fg-2">
          <code>{highlight(body.join("\n"), fence[1])}</code>
        </pre>,
      );
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)/);
    if (h) {
      const level = h[1].length;
      const size = ["text-[22px]", "text-[18px]", "text-[15px]", "text-[14px]", "text-[13px]", "text-[13px]"][level - 1];
      out.push(
        <p key={key} role="heading" aria-level={level} className={`${size} mt-3 leading-snug font-medium tracking-[-0.01em] text-balance text-fg first:mt-0`}>
          {inlineMd(h[2])}
        </p>,
      );
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      out.push(<hr key={key} className="border-line" />);
      i++;
      continue;
    }
    if (line.startsWith("|") && lines[i + 1]?.match(/^\|?\s*:?-{2,}/)) {
      const head = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(cells(lines[i++]));
      out.push(
        <div key={key} className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {head.map((c, j) => (
                  <th key={j} className="border-b border-line-strong px-2 py-1.5 text-start font-medium text-fg-3">
                    {inlineMd(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-line">
                  {r.map((c, j) => (
                    <td key={j} className="px-2 py-1.5 align-top text-fg-2">
                      {inlineMd(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    if (line.startsWith(">")) {
      const body: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) body.push(lines[i++].replace(/^>\s?/, ""));
      out.push(
        <blockquote key={key} className="border-s-2 border-line-strong ps-3 text-fg-3">
          {inlineMd(body.join(" "))}
        </blockquote>,
      );
      continue;
    }
    const bullet = /^(\s*)([-*+]|\d+[.)])\s+/;
    if (bullet.test(line)) {
      const ordered = /^\s*\d/.test(line);
      const items: { depth: number; text: string }[] = [];
      while (i < lines.length && bullet.test(lines[i])) {
        const m = lines[i].match(bullet)!;
        items.push({ depth: Math.min(3, Math.floor(m[1].length / 2)), text: lines[i].replace(bullet, "") });
        i++;
        // a wrapped line continues the item before it
        while (i < lines.length && lines[i].trim() && !bullet.test(lines[i]) && /^\s{2,}/.test(lines[i])) items[items.length - 1].text += " " + lines[i++].trim();
      }
      const List = ordered ? "ol" : "ul";
      out.push(
        <List key={key} className={`flex flex-col gap-1 ps-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-fg-5`}>
          {items.map((it, j) => (
            <li key={j} style={{ marginInlineStart: it.depth * 16 }}>
              {inlineMd(it.text)}
            </li>
          ))}
        </List>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|>|\||\s*([-*+]|\d+[.)])\s)/.test(lines[i])) para.push(lines[i++]);
    if (!para.length) para.push(lines[i++]);
    out.push(<p key={key}>{inlineMd(para.join(" "))}</p>);
  }
  return <div className="flex flex-col gap-3 text-[14px] leading-[1.7] text-pretty text-fg-2">{out}</div>;
}

/* ---------- CSV / TSV ---------- */

function parseDelimited(text: string, sep: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows.filter((r) => r.some((c) => c.trim()));
}

function Sheet({ text, sep }: { text: string; sep: string }) {
  const [head, ...rows] = parseDelimited(text, sep);
  const shown = rows.slice(0, 2000);
  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-auto rounded-[10px] shadow-[inset_0_0_0_1px_var(--line)]">
        <table className="w-full border-collapse text-[12.5px]">
          <thead className="sticky top-0 bg-raised">
            <tr>
              <th className="w-10 border-b border-line-strong px-2 py-1.5 text-end font-normal text-fg-5 tabular-nums">#</th>
              {(head ?? []).map((c, j) => (
                <th key={j} className="border-b border-line-strong px-2 py-1.5 text-start font-medium whitespace-nowrap text-fg-3">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i} className="border-b border-line hover:bg-white/[0.025]">
                <td className="px-2 py-1 text-end text-fg-6 tabular-nums">{i + 1}</td>
                {r.map((c, j) => (
                  <td key={j} className="px-2 py-1 whitespace-nowrap text-fg-2 tabular-nums">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-fg-5 tabular-nums">
        {rows.length.toLocaleString("en")} rows · {(head ?? []).length} columns{rows.length > shown.length ? ` · showing the first ${shown.length.toLocaleString("en")}` : ""}
      </p>
    </div>
  );
}

/* ---------- the switch ---------- */

export function docKind(mediaType: string, name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (mediaType === "application/pdf" || ext === "pdf") return "pdf";
  if (mediaType === "text/markdown" || ext === "md" || ext === "markdown") return "markdown";
  if (mediaType === "text/csv" || ext === "csv") return "csv";
  if (mediaType === "text/tab-separated-values" || ext === "tsv") return "tsv";
  if (mediaType === "application/json" || ext === "json") return "json";
  if (/xml/.test(mediaType) || ext === "xml") return "xml";
  return "text";
}

export function TextView({ text, kind }: { text: string; kind: string }) {
  if (kind === "markdown") return <Markdown text={text} />;
  if (kind === "csv" || kind === "tsv") return <Sheet text={text} sep={kind === "csv" ? "," : "\t"} />;
  if (kind === "json" || kind === "xml") {
    let pretty = text;
    if (kind === "json") {
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {}
    }
    return (
      <pre className="overflow-x-auto rounded-[10px] bg-surface p-3.5 font-mono text-[12.5px] leading-relaxed text-fg-2">
        <code>{highlight(pretty, kind === "json" ? "json" : "xml")}</code>
      </pre>
    );
  }
  return (
    <div className="text-[14px] leading-[1.7] whitespace-pre-wrap text-fg-2">
      {text.split("\n").map((l, i) => (
        <Fragment key={i}>
          {i > 0 && "\n"}
          {l}
        </Fragment>
      ))}
    </div>
  );
}

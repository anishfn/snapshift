import { Fragment, type ReactNode } from "react";

// The little markdown the writer is allowed: paragraphs, - lists, **bold** and `code`. Anything else stays text.

/** **bold** and `code` inside a line of text. */
export function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-medium text-fg">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code key={i} className="rounded-[6px] bg-control px-1 py-0.5 font-mono text-[0.85em] text-fg">
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export function Prose({ text, streaming }: { text: string; streaming?: boolean }) {
  const blocks = text.trim().split(/\n{2,}/);
  return (
    <div className="flex flex-col gap-3 text-[15px] leading-[1.65] text-pretty text-fg-2">
      {blocks.map((block, i) => {
        const last = i === blocks.length - 1;
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-*] /.test(l))) {
          return (
            <ul key={i} className="flex list-disc flex-col gap-1 ps-5 marker:text-fg-5">
              {lines.map((l, j) => (
                <li key={j} className={last && streaming && j === lines.length - 1 ? "caret" : undefined}>
                  {inline(l.replace(/^\s*[-*] /, ""))}
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className={`max-w-[68ch] ${last && streaming ? "caret" : ""}`}>
            {lines.map((l, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                {inline(l)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

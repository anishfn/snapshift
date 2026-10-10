---
name: taste
description: Anish's taste and the house rules for this chat (SubQ Snap picks how each answer looks). Use whenever adding, editing or reviewing anything here (components, layout, copy, motion, icons, colour), and update this file whenever Anish reveals more of their taste.
---

# snapshift, to Anish's taste

A chat where SubQ Snap (`subq-snap-preview`, Decisions API) reads the whole conversation every turn and decides
which component shows the answer, which earlier message it depends on and which artifacts to bring back; the writer
(`subq-preview`, Chat Completions) fills the text and the component's data. Built on the rules of Anish's lab
(`~/design-engineering/.claude/skills/catalog-taste/SKILL.md`): read that for the full reasoning, this file is what
applies here and what's different.

Stack: Next.js 16 (App Router, read `node_modules/next/dist/docs/` first), React 19, Tailwind v4, TypeScript, `motion`
(`motion/react`). Package manager: **bun**. `.env.local` holds `SUBQ_API_KEY` (gitignored).

## Taste

- **Dark, plain, minimal, rounded.** Anish asked for "all dark mode". Colours are semantic tokens in
  `src/app/globals.css` (`fg` to `fg-6`, `raised`, `control`, `accent`, `line`, `sidebar`); never raw greys,
  `bg-white` or `neutral-*`. Black-on-light accents became `bg-accent text-accent-fg` (near-white with dark text).
  Hovers are a soft white wash (`hover:bg-white/[0.06]`). Depth on dark is a hairline of light plus a deep drop
  (`shadow-surface`, `shadow-popover`), no blur.
- **ChatGPT-shaped, our materials.** A history sidebar on the left (new chat, demo, Today / Yesterday / Previous 7
  days / Older, delete on hover), folding away on wide screens and a drawer on phones. With it closed, its two
  controls sit **at the window's edge, top left, where it folds to**, never inside the chat column ("don't keep these
  inside chat window").
- **Empty chat: in the middle and minimal.** "Ask anything." with one quiet line, the composer right under it, and a
  plain "Try the demo conversation" link. No paragraph pitch, no big buttons. On the first send the composer glides
  down to the bottom (`layoutId="composer"`).
- **Assistant replies have no bubble.** The decision line above (`Snap · Comparison · 86% · 0.9s`, opens the full
  distribution) and a "From message N" chip when Snap went back; the component in a raised card.
- **Show Snap honestly.** Every number on screen is measured: Snap's latency and `usage.input_tokens`, the writer's
  time. Seeded demo replies were written by hand and say so; they never get a decision line.
- **Attach is a paperclip** (`PaperclipIcon`), not an image icon.
- No em dashes anywhere. Mono only for code. Icons are the lab's own (`src/components/icons.tsx`): 18px grid, puffy,
  1.6px lines, single tone; keep only icons that are used.
- Rounded squares, concentric: 20 for cards and the composer (8 inset, 12 inside), 12 for 36px controls, 10 for
  32px buttons and rows, 6 for small chips. Pills only for true circles (checks, dots).
- Nothing pops: everything conditional blur-fades through `AnimatePresence`; presses scale to 0.96 (`press`).

## Motion

Shared values in `src/lib/motion.ts` (from the lab): `easeOut`, `riseIn` for arriving messages, `iconSwap`, `press`,
plus `glide` (a spring with no bounce, 0.3s), `rowPress` and `tap`. Popovers 180ms in from 0.95, out in 100ms.
Streaming block items arrive from a 4px blur, no movement. No `backdrop-filter` anywhere, including the sticky header
and composer (solid fades instead).

- **Every state change transitions; nothing snaps.** Anish: "when any UI state changes, make sure it transitions
  good". Values that change in place (scaled amounts, counts, totals, a tooltip's title) blur-swap with `Swap`, no
  movement. Things that move to a new place glide (`glide`): chart tooltips, crosshairs and hover dots between
  points, rows settling into a sorted order (`Arrive reorder`), the selected tab's pill (`layoutId`), a map flying
  to a place. Things that open and close fold with height and opacity (tree folders, "Show more" rows, a long code
  block's window). Chart marks reshape (`d` animates) when a series is hidden or shown.
- **Full-width rows never scale on press** ("the bounce effect on click is bad here, do slight only tap"). The row
  darkens a touch while held (`rowPress`); only a small control inside it (a check, a step number) gives a slight
  squeeze (`tap`, 0.9, or `group-active:scale-90`). `press` (0.96) stays for real buttons.
- Tailwind v4's `scale-*`, `rotate-*` and `translate-*` set their own CSS properties: a custom transition list must
  name `scale`/`rotate`, not `transform`, or the change snaps (`transition-transform` covers all of them).
- A timeline rail runs from under one dot to the top of the next, across the gap between items, on the item itself.

## Components

Twenty-nine, all in `src/lib/blocks.ts` (what Snap is told, the writer's schema and rules) with renderers in
`src/components/blocks/`; `/components` shows each with a working sample from `src/lib/samples.ts` (everything there
can be ticked, sorted, answered and edited). Every component has a skeleton in its own shape, copes with
half-streamed data, and has a plain-text form for Copy under the reply. When the writer finishes without filling a
component, the reply says so with Ask again; it never just vanishes.

- **One card for every component.** `Block` (`components/blocks/index.tsx`) draws the same top bar on all of them:
  the component's own icon (from the lab set), its name, a short detail from the registry's `meta` ("5 rows", "3
  questions", "hero.tsx", "Pie"), the view's own tools, and Copy, always in the top-right corner. Views put tools
  there with `<Tools>` (a portal into the bar); `BlockHeader` draws a title in the body and sends its actions up.
  No view draws its own Copy, and no card has an empty row just to hold buttons ("design them better").
- **Large white fills are for what's chosen, not for everything.** Calendar event days are a soft fill with a dot
  (white only for the picked day), the itinerary's day pill is the control fill, images get a hairline of white
  at 10% so bright pictures don't bleed into the dark card. Timeline dates sit in their own column; steps are
  joined by a rail; code has line numbers; rupees group the Indian way (40,00,000) everywhere they're shown in full.
- **Interaction is the point.** Checklists, steps, recipe ingredients and quiz answers are ticked and saved into the
  conversation (`onChange` → `setData`); tables sort; trees fold; calendars page, mark today and save an .ics;
  maps pan and link to Maps; drafts are editable before copying; calculators recompute as sliders move (formulas
  read by a tiny parser in `calculator.tsx`, never `eval`); timers count against the clock and stay silent (the house
  has no sounds); flashcards flip in 3D and drop known cards; before & after reveals with a clipped slider; options can be multi-select and "Something else…"
  puts the cursor in the composer. Shared controls (`Action`, `CopyAction`, `BlockHeader`, `MoreToggle`,
  `Lightbox`) keep one look. Actions without a title row go to a foot row, never an empty header.
- **Charts follow the `dataviz` skill**, in seven kinds: line, area, bar, stacked, ranked, pie (a donut, at most six
  parts) and split. Series colours are tokens (`--series-1` to `--series-5`, the reference's dark steps, validated on
  `--raised`) in fixed order. One axis from zero, bars at most 24px with 4px rounded ends and 2px gaps, 2px lines, a
  legend only for two or more series (it hides and shows them), sparse direct labels, a tooltip by hover or arrow
  keys, beside the crosshair, a Table view and Copy data (tab-separated, pastes into a spreadsheet). Values already
  in % are shown once. Compact numbers (12.9K) on axes; full numbers (₹17,500) for totals someone acts on.
- **Maps use Esri's Dark Gray Canvas tiles**, keyless, dimmed to the palette, max zoom 16, with "Powered by Esri"
  and OpenStreetMap credit. CARTO's dark tiles started returning "API KEY REQUIRED". No map library.
- Status colours (`--good`, `--bad`) only ever beside an icon and words, never as a series.
- Every reply ends with Copy and Ask again, quiet until pointed at, always visible on touch.
- **Documents open in a panel on the right** ("how other LLMs do that"), `src/components/viewer/`: click a PDF or
  doc chip in a message, the composer or a gallery and it slides in from the right (0.34s in, 0.22s out); the chat
  narrows beside it on a wide screen (padding follows directly while the edge is dragged, eases otherwise), and on
  a phone it covers the chat with the page behind it locked. PDFs render as white pages with PDF.js (worker served
  from `public/pdf.worker.min.mjs`), lazily, at screen density, with a page counter, zoom and a Text view;
  Markdown renders, CSV/TSV become a table, JSON is indented and coloured. Copy text, download, close; Escape
  closes unless an image viewer is on top; focus returns to the chip. Images in messages open the Lightbox.
- Suggestion chips are always one row that scrolls sideways: wrapped, they crowded the chat once the panel
  narrowed it.

## Bringing things in

Attach is a small menu that opens upward from the composer: files from this device, a GitHub repository, a web
page. The last two open one dialog (`src/components/sources/source-dialog.tsx`) with two tabs, the selected tab's
fill gliding between them.

- **Show what it costs before adding.** A repository is listed first, never fetched blind: its files, how many
  tokens they take "of the N still free in Snap's context" on a bar, and a folder browser with tick boxes (a
  third, dash state for a folder with only some files in). Over budget or over 250 files: a plain line with an
  icon says by how much and the Add button waits. What didn't fit is left out for you (tests, examples and docs
  first) and named, so it can be ticked back.
- The dialog keeps one height across idle, loading (a skeleton in the listing's shape) and loaded, so nothing
  jumps when a lookup returns. It closes into the message box: with a repository added, the question comes next.
- A repository is **one chip** everywhere (composer and message), never hundreds; in a message it unfolds to its
  files with a height fold. Its icon is a branch, in the house line style.
- Errors are sentences with the fix in them ("a private one needs GITHUB_TOKEN in .env.local").
- Server side: `src/lib/github.ts` (one call for the repo, one for the tree, files from raw.githubusercontent.com
  in batches of 40 so the dialog can count them in) and `src/lib/page.ts` (HTML to text, public addresses only).

## The writer

Picked by `WRITER` in `.env.local` (else the first key present: OpenRouter, Gemini, SubQ):

- **OpenRouter, free** (`WRITER=openrouter`, `OPENROUTER_API_KEY`, the current choice): `dots-studio/dots-3-note-preview:free`
  (JSON-schema output, takes images), falling back to `nvidia/nemotron-3-super-120b-a12b:free` when it's busy. Of
  the free models it was the only one to get the demo's launch checklist right; others only listed what was left,
  were rate-limited upstream, or don't do JSON schema. Slow on the full demo (25 to 37s a reply) and the free tier
  allows only so many requests a day; `OPENROUTER_MODEL` overrides it.
- **Gemini** (`WRITER=gemini`, `GEMINI_API_KEY`): `gemini-3.6-flash`, 3 to 7s a reply on the same demo; 3.7 and 3.8
  flash took 45 to 53s and flash-lite was fast but wrong.
- **SubQ** (`WRITER=subq`): `subq-preview`, once its early access opens.

OpenRouter and Gemini see the images Snap looked at and get documents as text. PDFs are turned into text on the
server (`src/lib/pdf.ts`, unpdf, page by page) before Snap or any writer sees them: the free OpenRouter model
rejects a PDF outright ("Provider returned error"), and Snap only reads text, so it picked Options at 46% from a bare
file name and Tree at 80% once it could read the PDF. A scan with no text layer is said to be unreadable, honestly.
Em dashes in anything the writer produces are replaced on the server (number ranges keep a hyphen): the prompt asks,
free models don't always listen. Provider errors show the provider's own reason (OpenRouter's `metadata.raw`). A 503/429 is retried once quietly.
Rules that must hold in a long context (how many quiz questions) go in the schema's field descriptions, where the
model writes the list, not only in the system prompt. The writer is credited in "How Snap decided".

## How a turn works

`/api/turn` streams NDJSON: `decision` the moment Snap answers, then `partial`s, then `done` or `error`.
Snap's questions live in `src/lib/decide.ts`: the component choice, `also` (does the reply need a second or third
component), a recall choice over every earlier message, which files to bring back, and a depth score. A choice
needs at least two options: the recall question is left out on a conversation's first message, or Snap rejects
the whole call.

- **More than one component** when the user asks for several things ("plan it, map it, budget it"): the main one
  plus up to two extras, stacked as separate cards, the decision line reading `Itinerary + Map + Breakdown`. An
  extra needs 30% of `also` and `none` under 20%; with only the first rule Snap added a verdict to pros and cons
  and code to steps (handy, not asked for). 24 of 24 on the test questions, no slower.
- **Questions cost more than tokens.** At 130k tokens a yes/no for each of 54 files took 5.5s; one choice over
  them took 1.8s with 96% on the right file. Up to 12 files get a yes/no each (exact, several can be yes); more
  than 12 get one ranked `files` choice.
- **The writer reads the whole conversation but only the documents Snap picked** (plus any attached to the newest
  message). That is what lets a chat hold a whole codebase. This is file routing, not the dropped message-memory
  idea: **no separate memory layer**; Anish tried "Snap as the memory" for messages and other chats and dropped
  it the same day, don't bring it back unless asked.
- **Two demos**: "Demo conversation" (54 messages, recall and images) and "Codebase demo" (this app's source, 54
  files, 137k tokens, a snapshot from `scripts/codebase-demo.mjs`). A message with more than nine files shows six
  and folds the rest behind "Show 48 more files".
- The decision line also says how much Snap read (`· 137k tokens read`) and, when Snap picked documents, a chip
  with the file's name that opens it in the panel.

Component descriptions for Snap are in `src/lib/blocks.ts`: when Snap picks the wrong
component, sharpen these first (Decision vs Comparison overlapped until Decision said "Not for choosing among
several options").

## README and diagrams

`README.md` is written for an ADHD reader: a 30-second TL;DR, a "pick your path" table, a picture before each wall
of text, short bullets, deep dives folded into `<details>`. Diagrams are real Excalidraw (`docs/diagrams/*.svg`,
editable `.excalidraw` beside them), generated from `docs/diagrams/source/` with the Excalidraw library in headless
Chromium (the page must declare UTF-8 or "·" and "→" turn to mojibake).

**Diagrams are simple** ("fix these excalidraw diagrams... make simpler diagrams for all", after labels were
struck through by their own arrows and ran into boxes): three to seven boxes, a few words each, big type; the
detail lives in the README's text and tables, not in the picture. Nothing is ever written on an arrow: a label
sits above or below its line, centred, and the gap between two boxes is wider than the label in it. A pair of
arrows going both ways gets one label above the top one and one below the bottom one. Words in a box are centred
with room around them. The generator warns when a label is wider than its box or its gap.

## Verify

`bunx tsc --noEmit`, `bun run lint`, `bun run build`. If a CSS change doesn't show in a production build, delete
`.next` and rebuild: Turbopack kept serving a stale stylesheet once. Point `SUBQ_BASE_URL` at a local stand-in to
test the UI without spending credits.

## Taste log

- 2026-10-10: Built from the brief: Snap decides the UI, the writer writes, long context and images stay in context.
  v1 adds a context meter and a 54-message demo.
- 2026-10-10: Added the ChatGPT-style history sidebar.
- 2026-10-10: Empty state "do something better in the middle and minimal": centred line and composer.
- 2026-10-10: Attach uses a paperclip.
- 2026-10-10: Sidebar controls move to the window edge when it's closed. Everything dark.
- 2026-10-10: "Create more UIs, graphs, charts, a map": eight more (Chart, Stats, Map, Code, Calendar, Options, Matrix,
  Tree), sixteen in all, and a `/components` page listing what Snap chooses from. Checked against real Snap: 9 of 10
  plain questions got the intended component at about 0.9s.
- 2026-10-10: "Design the components better, focus on the UX, more components, more charts like a pie": every
  component made interactive, nine new ones (Recipe, Quiz, Itinerary, Pros & cons, Scorecard, Draft, Links, Rewrite,
  Breakdown), chart kinds to seven, Copy and Ask again under replies. 25 interaction checks pass; real Snap picked the
  right component for 12 of 12 plain questions at about 0.9s.
- 2026-10-10: "Use the Gemini key since subq-preview isn't available": Gemini writes; SubQ Snap still decides.
- 2026-10-10: "Line not connecting dot" on the timeline; "the bounce effect on click is bad, do slight only tap" on
  the checklist; chart hover "from one year to next, make the transition smooth"; "when any UI state changes, make
  sure it transitions good". Motion section rewritten around these.
- 2026-10-10: "Use this OpenRouter key with a free model": OpenRouter's free dots 3 note writes now; Gemini and SubQ
  stay one setting away.
- 2026-10-10: A PDF sent alone ("tree.pdf") failed with "OpenRouter said: Provider returned error": PDFs now become
  text on the server for every writer and for Snap; writer em dashes are stripped server-side.
- 2026-10-10: "Add a PDF or doc viewer, open it on a right sidebar how other LLMs do that": the document panel.
- 2026-10-10: "Write a good, detailed README with Excalidraw diagrams, I have ADHD, highlight all Snap strengths".
- 2026-10-10: "Design all the UI components better, and create a little more": one card frame with a shared top
  bar, quieter whites, timeline/steps/code/calendar/table refinements, and four new components (Calculator, Timer,
  Flashcards, Before & after): 29 in all. 30 interaction checks pass; real Snap picked the new four 7 of 7 and kept
  3 of 3 neighbours.
- 2026-10-10: Tried "Snap as a memory layer" (the writer gets only what Snap remembers). Asked whether it beats how
  chatbots normally handle memory, the honest answer was "not proven, and it doesn't scale past ~250 messages";
  Anish: "drop this idea and remove the code". Removed: back to one recall message and the whole transcript.
- 2026-10-10: Popovers opened underneath the sticky composer; a message with an open popover now sits above it.
- 2026-10-10: "Can it show multiple components for one question?" then "do it": up to three per reply.
- 2026-10-10: Anish's brief for the pitch (384K context, text + images, about 1s decisions, right model for the
  right task): the app now shows two of those on screen: the decision/writer split with measured times, and long
  context through the Codebase demo. Measured, not quoted: 137k tokens in 2.5 to 3s, 342k in 4.8s.
- 2026-10-10: "Add more features like reading a GitHub repo and stuff, create UI for it as well": the attach menu
  and the repository / web page dialog.
- 2026-10-10: "Fix these excalidraw diagrams, and make simpler diagrams for all": all six redrawn simply, with
  labels beside the arrows instead of on them.
- 2026-10-10: The app is called snapshift now: in the sidebar, the page title, the package and the repository.

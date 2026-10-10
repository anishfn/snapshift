import type { Artifact, Conversation, Message } from "../types";

// A long, real-feeling conversation to start from: picking which lab pieces go on the anishfn.ink homepage.
// Message 5 sets a rule that matters fifty messages later; the share cards and the taste doc stay in context the
// whole way. Replies here were written by hand for the demo, not by Snap or the writer, and are shown that way.

const images: [string, string, string][] = [
  ["folder-maker", "Folder maker", "Share card for Folder maker: a light blue macOS-style folder on a soft grey card, labelled Tool. Turns any photo into a Mac folder icon."],
  ["handdrawn-frames", "Handdrawn frames", "Share card for Handdrawn frames: a black and white photo of a sleeping street cat inside a red doodled frame with curls at the corners, labelled Tool."],
  ["dia-gradient", "Dia gradient", "Share card for Dia gradient: a stepped pyramid of soft blurred columns, pink and orange at the top fading through yellow to pale blue, labelled Component."],
  ["video-cube", "Video cube", "Share card for Video cube: four pastel rounded blocks (pink, lavender, orange, mint) in a staggered grid, nature clips playing on their ends, labelled Component."],
  ["axolotl-pond", "Axolotl pond", "Share card for Axolotl pond: four axolotls in a sunlit green pond with rippling caustics, stones, lily pads and small flowers, labelled Component."],
  ["pixel-art", "Pixel art 3D", "Share card for Pixel art 3D: a pixel-art Pop Cat with its mouth open, turned into chunky 3D blocks, labelled Tool."],
];

type Line = [role: "u" | "a", text: string, artifacts?: string[]];

const lines: Line[] = [
  ["u", "I'm redoing the homepage of anishfn.ink. I want the lab pieces to be the first thing people see, not a bio."],
  ["a", "Good call. The pieces are the strongest proof of what you do. How many are you thinking of putting up top, and how much room is there?"],
  ["u", "Not sure yet. The lab has ten pieces now. All ten up top is too much."],
  ["a", "Agreed. Ten live pieces above the fold would be heavy to load and hard to take in. A small, deliberate set reads as taste, and the full wall can sit one click away at lab.anishfn.ink."],
  ["u", "One hard rule before we go further: nothing with WebGL above the fold on the homepage. Phones choke on it and the first impression is a stutter. WebGL pieces can live further down or on the lab."],
  ["a", "Noted: no WebGL above the fold. That rules out anything on three.js or a custom WebGL canvas for the hero, however good it looks. Canvas 2D, SVG and CSS pieces are fair game."],
  ["u", "Also no carousel. Carousels hide things."],
  ["a", "No carousel, then. A fixed row people take in at one glance."],
  ["u", "What do portfolios like this usually put up top?"],
  ["a", "Mostly one of three things: one big piece that sets the tone, a short row of pieces that shows range, or a line of text with a single piece beside it. For a lab with both tools and components, a short row shows the range best."],
  ["u", "Row it is. Three tiles across on desktop, about 380px each, stacking on phones."],
  ["a", "Three at 380px fits your 1200px column with room for gaps. On phones they stack, so the first tile carries the first impression: put the most immediately readable piece first."],
  ["u", "Should the tiles be live or stills?"],
  ["a", "Live if they're cheap, stills if they're not. Since the hero is already WebGL-free, the pieces that qualify are light enough to run live, which is the whole point of the lab: every block is the real thing."],
  ["u", "Makes sense. Let me pull the share cards so we're looking at the same thing."],
  ["a", "Sounds good. Share cards are a nice way to compare them since they're all framed the same way."],
  ["u", "First three. These are the tools and the one CSS piece.", ["a1", "a2", "a3"]],
  ["a", "Got them: Folder maker, Handdrawn frames and Dia gradient. All three read instantly as a thumbnail: a folder, a framed cat, a gradient. That matters for a hero."],
  ["u", "Folder maker draws on a 2D canvas, the frames are SVG, the gradient is plain CSS with a few motion values."],
  ["a", "So all three are WebGL-free. Good to know as we go."],
  ["u", "The gradient was designed by Sebastian Dahiya, I made it live. If it goes on the homepage I want him credited."],
  ["a", "Then the tile needs a line under it, or the credit goes on the piece's page with a link from the tile. A tiny \"design by Sebastian Dahiya\" under the tile is the honest version."],
  ["u", "And the other three. These are the heavy ones.", ["a4", "a5", "a6"]],
  ["a", "Video cube, Axolotl pond and Pixel art 3D. These are the most striking of the six, honestly. The pond especially."],
  ["u", "Yeah but the cube and pixel art are three.js and the pond is a custom WebGL2 renderer. All three are WebGL."],
  ["a", "Then by your rule none of those three can go above the fold. They'd make a great second row further down the page, where they can load after the hero has painted."],
  ["u", "Second row, lazy loaded, maybe. I'll think about it."],
  ["a", "Lazy loading them once they're near the viewport would keep the first paint clean. Their stills could hold the space until then."],
  ["u", "Here's my taste file for the lab, it's got all the rules I've been keeping. Use it.", ["a7"]],
  ["a", "Read it. A few rules that matter for the homepage: plain, minimal, rounded; one 1200px column; no boxes around boxes; nothing pops, everything blur-fades; no em dashes; copy in first person. I'll hold the homepage to the same rules."],
  ["u", "What does it say about the footer?"],
  ["a", "It's settled on one small line: the mark and \"© year anishfn\" on the left, \"made with care\" in the hand font on the right, the mark at 24px. There's a note that dot separators orphaned when the line wrapped on phones."],
  ["u", "Right, that wrapping bug is on the homepage too."],
  ["a", "Same fix should work there: drop the inline dot separators and let the two halves wrap as whole groups."],
  ["u", "What font size for the tile titles?"],
  ["a", "Your lab shows names only on hover, as a 12px pill. On a homepage hero, a visible 15px medium title under each tile would help visitors who don't hover, especially on phones where hover doesn't exist."],
  ["u", "Launch is October 20. Before then: homepage share image, write the bio, fix the footer wrapping on phones, run Lighthouse on a mid-range Android, set up redirects from the old /work pages, and pick the three hero pieces."],
  ["a", "Here's the list so far.", undefined],
  ["u", "The share image should match the lab's style."],
  ["a", "Then one big rounded block on the grey, text only: the mark, your name, one line. Your taste file says the lab's home card never shows pieces, so the homepage card probably shouldn't either."],
  ["u", "Good. What should the bio say?"],
  ["a", "Short and first person: what you make and for whom, in one or two sentences, then a link to the lab. Let the pieces do the convincing."],
  ["u", "\"I design and build interfaces, and keep a lab of the components and tools I make.\" That's it."],
  ["a", "That works. It's plain, it's yours, and it points at the lab. Bio's done, then."],
  ["u", "How heavy is too heavy for the hero, in kilobytes?"],
  ["a", "Your lab's wall ships about 229KB of gzipped JS. Keeping the homepage under that, with the hero pieces' code included, is a fair bar."],
  ["u", "Ok. Spent the afternoon on the footer."],
  ["a", "How did it go?"],
  ["u", "Footer's fixed. It was the dot separators orphaning, like the lab. Removed them."],
  ["a", "Nice, that's two off the list."],
  ["u", "Redirects from /work are in too. Everything 301s to the lab."],
  ["a", "Three down. That leaves the share image, the Lighthouse run and picking the hero pieces."],
  ["u", "Lighthouse I'll do on my sister's phone this weekend."],
  ["a", "A real mid-range Android is the right test. Run it on the production build, not dev."],
];

const checklist = {
  title: "Before October 20",
  items: [
    { text: "Homepage share image", done: false, note: "" },
    { text: "Write the bio", done: false, note: "" },
    { text: "Fix the footer wrapping on phones", done: false, note: "" },
    { text: "Lighthouse on a mid-range Android", done: false, note: "" },
    { text: "Redirects from the old /work pages", done: false, note: "" },
    { text: "Pick the three hero pieces", done: false, note: "" },
  ],
};

const SOURCE = { kind: "github", label: "anishfn/snapshift", url: "https://github.com/anishfn/snapshift" } as const;

/**
 * The second demo: this app's own source, every file in one chat. About 155k tokens that Snap reads on each
 * turn; the writer is handed only the file Snap picks. The files are a snapshot (scripts/codebase-demo.mjs).
 */
export async function codebaseConversation(): Promise<Conversation> {
  const files: { name: string; text: string }[] = await (await fetch("/demo/codebase.json")).json();
  const artifacts: Record<string, Artifact> = {};
  files.forEach((f, i) => {
    const id = `a${i + 1}`;
    // one source, so the message shows one chip that unfolds, the way an attached repository does
    artifacts[id] = { id, kind: "doc", name: f.name, mediaType: "text/plain", text: f.text, bytes: f.text.length, source: SOURCE };
  });
  const at = Date.now() - 10 * 60 * 1000;
  const messages: Message[] = [
    { id: "m1", role: "user", text: `Here's the whole source of this app, all ${files.length} files. I want to ask questions about it.`, at, seeded: true, artifacts: Object.keys(artifacts) },
    { id: "m2", role: "assistant", text: `Got all ${files.length} files. Ask me anything about the code.`, at: at + 20_000, seeded: true },
  ];
  return {
    id: crypto.randomUUID(),
    updatedAt: Date.now(),
    title: "This app's source",
    messages,
    artifacts,
  };
}

// A day's support queue for a made-up notes app, with the two internal documents an agent works from and the
// screenshots two customers attached. The pictures carry facts the text doesn't: the payment error code that
// decides which team gets the ticket, and the two identical charges that make it a duplicate. Their captions say
// only whose they are, so the answer has to come from looking.
export async function supportConversation(): Promise<Conversation> {
  const docs = await Promise.all(
    (
      [
        ["tickets.csv", "text/csv"],
        ["refund-policy.md", "text/markdown"],
        ["routing-guide.md", "text/markdown"],
      ] as const
    ).map(async ([name, mediaType]) => ({ name, mediaType, text: await (await fetch(`/demo/support/${name}`)).text() })),
  );
  const artifacts: Record<string, Artifact> = {};
  docs.forEach((d, i) => {
    const id = `a${i + 1}`;
    artifacts[id] = { id, kind: "doc", name: d.name, mediaType: d.mediaType, text: d.text, bytes: d.text.length };
  });
  artifacts.a4 = { id: "a4", kind: "image", name: "checkout-error.webp", mediaType: "image/webp", src: "/demo/support/checkout-error.webp", caption: "The screenshot attached to ticket T-1034.", bytes: 0 };
  artifacts.a5 = { id: "a5", kind: "image", name: "bank-statement.webp", mediaType: "image/webp", src: "/demo/support/bank-statement.webp", caption: "The screenshot attached to ticket T-1031.", bytes: 0 };
  const at = Date.now() - 10 * 60 * 1000;
  const messages: Message[] = [
    {
      id: "m1",
      role: "user",
      text: "Here's today's support queue for Lumen (24 tickets), our refund policy, the routing guide, and the two screenshots customers attached. I'm on triage this morning.",
      at,
      seeded: true,
      artifacts: Object.keys(artifacts),
    },
    { id: "m2", role: "assistant", text: "Got the queue, both documents and both screenshots. What do you want to work through first?", at: at + 20_000, seeded: true },
  ];
  return {
    id: crypto.randomUUID(),
    updatedAt: Date.now(),
    title: "Support desk",
    messages,
    artifacts,
  };
}

export async function demoConversation(): Promise<Conversation> {
  const taste = await (await fetch("/demo/taste.md")).text();
  const artifacts: Record<string, Artifact> = {};
  images.forEach(([slug, title, caption], i) => {
    const id = `a${i + 1}`;
    artifacts[id] = { id, kind: "image", name: `${title}.webp`, mediaType: "image/webp", src: `/demo/${slug}.webp`, caption, bytes: 0 };
  });
  artifacts.a7 = { id: "a7", kind: "doc", name: "lab-taste.md", mediaType: "text/markdown", text: taste, bytes: taste.length };

  const start = Date.now() - 3 * 60 * 60 * 1000;
  const step = (3 * 60 * 60 * 1000 - 10 * 60 * 1000) / lines.length;
  const messages: Message[] = lines.map(([role, text, ids], i) => ({
    id: `m${i + 1}`,
    role: role === "u" ? "user" : "assistant",
    text,
    at: Math.round(start + i * step),
    seeded: true,
    ...(ids && { artifacts: ids }),
  }));

  // The launch list was shown as a checklist when it first came up.
  const list = messages.find((m) => m.text === "Here's the list so far.")!;
  list.component = "checklist";
  list.data = checklist;

  return { id: crypto.randomUUID(), updatedAt: Date.now(), title: "Homepage picks", messages, artifacts };
}

import type { BlockId } from "./blocks";

// One filled example per component, from the demo's world (the lab, the homepage launch, a weekend away). Used by
// /components and by local test stand-ins; never shown as if a model had written it.

export const samples: Record<Exclude<BlockId, "text">, unknown> = {
  comparison: {
    options: [
      { title: "Folder maker", artifact: "a1", summary: "A folder anyone recognises in a split second.", points: [{ text: "Canvas 2D, no WebGL", good: true }, { text: "Instantly readable", good: true }], picked: true },
      { title: "Handdrawn frames", artifact: "a2", summary: "Warm and personal.", points: [{ text: "SVG, light", good: true }, { text: "Busier thumbnail", good: false }], picked: true },
      { title: "Video cube", artifact: "a4", summary: "The most striking, and the heaviest.", points: [{ text: "three.js, WebGL", good: false }], picked: false },
    ],
    footnote: "WebGL pieces stay below the fold.",
  },
  gallery: {
    items: [
      { artifact: "a1", title: "Folder maker", caption: "Any photo as a Mac folder." },
      { artifact: "a2", title: "Handdrawn frames", caption: "A doodled frame, in black and white." },
      { artifact: "a3", title: "Dia gradient", caption: "A soft pyramid that follows the pointer." },
      { artifact: "a5", title: "Axolotl pond", caption: "Four axolotls in a sunlit pond." },
      { artifact: "a6", title: "Pixel art 3D", caption: "Draw pixels, press Enter, turn them." },
      { artifact: "a4", title: "Video cube", caption: "Pastel blocks with nature inside." },
    ],
  },
  timeline: {
    events: [
      { when: "Oct 4", title: "First tool on the wall", detail: "Draw on a macOS folder, paint, export." },
      { when: "Oct 4", title: "Image only", detail: "Became image-only with a public wall and X credit." },
      { when: "Oct 4", title: "Matched the real icon", detail: "Measured the macOS folder and matched its insets." },
      { when: "Oct 5", title: "Honest colour", detail: "Grey photos stopped producing a reddish folder." },
      { when: "Oct 5", title: "Shown on the wall", detail: "Clicking a shared folder opens it in the maker." },
      { when: "Oct 6", title: "Transparent download", detail: "A clean cutout, no baked shadow." },
      { when: "Oct 7", title: "Newest first", detail: "Moved to the top of the wall." },
    ],
  },
  checklist: {
    title: "Before October 20",
    items: [
      { text: "Homepage share image", done: false, note: "" },
      { text: "Write the bio", done: true, note: "" },
      { text: "Fix the footer on phones", done: true, note: "" },
      { text: "Lighthouse on a mid-range Android", done: false, note: "this weekend" },
    ],
  },
  decision: {
    question: "Lazy-load the WebGL row?",
    answer: "yes",
    verdict: "Once it's near the viewport",
    confidence: 0.85,
    reasons: ["Keeps the first paint WebGL-free", "Stills hold the space until then"],
    caveat: "Check the stills match the live pieces, or the handover jumps.",
  },
  table: {
    columns: ["Piece", "Kind", "Renderer", "JS (KB)"],
    rows: [
      ["Folder maker", "Tool", "Canvas 2D", "38"],
      ["Dia gradient", "Component", "CSS", "12"],
      ["Axolotl pond", "Component", "WebGL2", "94"],
      ["Video cube", "Component", "three.js", "161"],
      ["Handdrawn frames", "Tool", "SVG", "27"],
    ],
  },
  steps: {
    steps: [
      { title: "Build for production", detail: "Run `bun run build`, never measure dev." },
      { title: "Open it on the phone", detail: "A real mid-range Android, over USB debugging." },
      { title: "Run Lighthouse", detail: "Mobile preset, three runs, keep the median." },
    ],
    done: [0],
  },
  chart: {
    title: "JavaScript shipped per page",
    kind: "bar",
    unit: "KB",
    labels: ["Wall", "Piece page", "3D piece", "Homepage"],
    series: [{ name: "Gzipped JS", values: [229, 243, 390, 212] }],
  },
  stats: {
    items: [
      { label: "Homepage JS", value: "212 KB", delta: "-17 KB vs the wall", direction: "down", good: true, trend: [262, 255, 249, 240, 236, 229, 224, 221, 218, 215, 213, 212] },
      { label: "Weekly visitors", value: "2,890", delta: "+25% vs last week", direction: "up", good: true, trend: [820, 1140, 980, 1620, 2310, 2890] },
      { label: "Launch tasks done", value: "3 of 6", delta: "", direction: "flat", good: true, trend: [] },
    ],
  },
  map: {
    places: [
      { name: "Cubbon Park", lat: 12.9763, lng: 77.5929, note: "start, by the library" },
      { name: "Lalbagh", lat: 12.9507, lng: 77.5848, note: "glass house" },
      { name: "Indiranagar", lat: 12.9719, lng: 77.6412, note: "coffee to finish" },
    ],
    route: true,
  },
  code: {
    language: "tsx",
    filename: "hero.tsx",
    code: '// The homepage hero: three live pieces, rising in once.\nimport { motion } from "motion/react";\nimport { riseIn } from "@/lib/motion";\n\nexport function Hero({ pieces }: { pieces: string[] }) {\n  return (\n    <section className="grid gap-4 sm:grid-cols-3">\n      {pieces.map((slug, i) => (\n        <motion.a key={slug} href={`/${slug}`} {...riseIn(i * 0.08)}>\n          {slug}\n        </motion.a>\n      ))}\n    </section>\n  );\n}\n\nexport const HERO_COUNT = 3;\n// keep WebGL out of here\nexport const WEBGL_ALLOWED = false;\nexport default Hero;',
  },
  calendar: {
    events: [
      { date: "2026-10-12", title: "Lighthouse run", note: "on the Android" },
      { date: "2026-10-15", title: "Share image", note: "" },
      { date: "2026-10-18", title: "Pick the hero pieces", note: "" },
      { date: "2026-10-20", title: "Launch", note: "anishfn.ink" },
      { date: "2026-11-02", title: "Look back", note: "what visitors clicked" },
    ],
  },
  options: {
    question: "Which pieces should the second row show?",
    multiple: true,
    options: [
      { label: "Video cube", detail: "three.js" },
      { label: "Axolotl pond", detail: "WebGL2" },
      { label: "Pixel art 3D", detail: "three.js" },
      { label: "Morfe card", detail: "WebGL2" },
    ],
  },
  matrix: {
    x: { label: "Effort", low: "Quick", high: "Slow" },
    y: { label: "Impact", low: "Low", high: "High" },
    quadrants: { top_left: "Quick wins", top_right: "Big bets", bottom_left: "Fill-ins", bottom_right: "Skip" },
    items: [
      { name: "Share image", x: 0.25, y: 0.7 },
      { name: "Lighthouse run", x: 0.2, y: 0.85 },
      { name: "Lazy WebGL row", x: 0.7, y: 0.75 },
      { name: "Footer polish", x: 0.3, y: 0.2 },
      { name: "Custom cursor", x: 0.8, y: 0.15 },
      { name: "Bio", x: 0.22, y: 0.66 },
    ],
  },
  tree: {
    kind: "files",
    items: [
      { name: "src/", depth: 0, note: "" },
      { name: "app/", depth: 1, note: "" },
      { name: "page.tsx", depth: 2, note: "the homepage" },
      { name: "layout.tsx", depth: 2, note: "" },
      { name: "components/", depth: 1, note: "" },
      { name: "hero.tsx", depth: 2, note: "three tiles" },
      { name: "footer.tsx", depth: 2, note: "" },
      { name: "public/", depth: 0, note: "" },
      { name: "og.png", depth: 1, note: "share image" },
    ],
  },
  recipe: {
    title: "Masala chai",
    servings: 2,
    prep: "2 min",
    cook: "8 min",
    ingredients: [
      { amount: 1, unit: "cup", item: "water" },
      { amount: 1, unit: "cup", item: "whole milk" },
      { amount: 2, unit: "tsp", item: "loose black tea (Assam)" },
      { amount: 1.5, unit: "tsp", item: "sugar, or to taste" },
      { amount: 4, unit: "", item: "green cardamom pods, crushed" },
      { amount: 1, unit: "", item: "thin slice of ginger, crushed" },
    ],
    steps: [
      "Bring the water to a boil with the cardamom and ginger, then simmer for 2 minutes.",
      "Add the tea and simmer for another minute until it's deep amber.",
      "Pour in the milk and sugar, bring it up until it rises, then lower the heat and let it rise twice more.",
      "Strain into cups.",
    ],
  },
  quiz: {
    title: "The lab's rules",
    questions: [
      { question: "What's the corner radius of a block on the wall?", choices: ["12px", "16px", "24px", "32px"], answer: 2, explain: "Blocks and the stage are 24; cards are 16, 36px controls 12." },
      { question: "Which font is only for code?", choices: ["Public Sans", "JetBrains Mono", "Caveat"], answer: 1, explain: "Mono is for code and commands only; numbers use the sans with tabular figures." },
      { question: "What should never animate?", choices: ["Hover states", "Keyboard-initiated actions", "Popovers", "Toasts"], answer: 1, explain: "Things you do hundreds of times a day should feel instant." },
    ],
  },
  itinerary: {
    title: "A weekend in Pondicherry",
    days: [
      {
        label: "Sat",
        items: [
          { time: "07:30", title: "Sunrise on the Promenade", place: "Promenade Beach", note: "before it gets hot" },
          { time: "09:00", title: "Breakfast", place: "Baker Street", note: "croissants" },
          { time: "11:00", title: "Walk the French Quarter", place: "White Town", note: "" },
          { time: "19:00", title: "Dinner by the sea", place: "Le Café", note: "" },
        ],
      },
      {
        label: "Sun",
        items: [
          { time: "08:00", title: "Auroville", place: "Matrimandir viewing point", note: "book the day before" },
          { time: "13:00", title: "Lunch", place: "Auroville Bakery", note: "" },
          { time: "16:30", title: "Paradise Beach", place: "Paradise Beach", note: "last ferry 17:30" },
        ],
      },
      { label: "Mon", items: [{ time: "10:00", title: "Drive back", place: "", note: "leave before the traffic" }] },
    ],
  },
  proscons: {
    subject: "Moving the lab onto the homepage",
    pros: ["One place for everything", "Visitors see the work first", "Fewer pages to maintain"],
    cons: ["Heavier first load", "WebGL pieces would need lazy loading", "The lab loses its own identity"],
    verdict: "Keep the lab separate and link three pieces from the homepage: most of the upside, none of the weight.",
  },
  scorecard: {
    subject: "Homepage, before launch",
    overall: 7.5,
    max: 10,
    criteria: [
      { name: "First impression", score: 9, note: "The hero shows the work straight away." },
      { name: "Speed on phones", score: 6, note: "212 KB of JS; lazy-load the second row to get under 180." },
      { name: "Copy", score: 8, note: "Short and in your voice." },
      { name: "Accessibility", score: 7, note: "Focus rings are there; add a skip link." },
    ],
  },
  draft: {
    kind: "email",
    to: "sebastian@example.com",
    subject: "The Dia gradient is on my homepage",
    body: "Hi Sebastian,\n\nThe Dia gradient you designed for Morfe is one of the three pieces on my new homepage, live from October 20. It's credited to you under the tile and on its page.\n\nIf you'd like the credit to read differently, tell me and I'll change it.\n\nThanks again,\nAnish",
  },
  links: {
    items: [
      { title: "Lighthouse", url: "https://developer.chrome.com/docs/lighthouse/overview", note: "How the audits work and what each score means." },
      { title: "Web Vitals", url: "https://web.dev/articles/vitals", note: "LCP, INP and CLS, and the thresholds that count." },
      { title: "Next.js: Lazy loading", url: "https://nextjs.org/docs/app/guides/lazy-loading", note: "next/dynamic for the WebGL row." },
    ],
  },
  rewrite: {
    original: "I'm a designer and developer who loves building things for the web, and this is my portfolio where you can see some of the work that I have done.",
    revised: "I design and build interfaces, and keep a lab of the components and tools I make.",
    summary: "Half the length, first person, and it points at the lab.",
  },
  breakdown: {
    title: "Pondicherry weekend",
    unit: "₹",
    items: [
      { label: "Stay", amount: 9000, note: "2 nights" },
      { label: "Fuel and tolls", amount: 3200, note: "" },
      { label: "Food", amount: 4500, note: "estimate" },
      { label: "Auroville and ferry", amount: 800, note: "" },
    ],
    people: 3,
  },
  calculator: {
    title: "Monthly payment on a home loan",
    inputs: [
      { id: "amount", label: "Loan amount", value: 4000000, min: 500000, max: 10000000, step: 100000, unit: "₹" },
      { id: "rate", label: "Interest rate", value: 8.5, min: 6, max: 14, step: 0.1, unit: "%" },
      { id: "years", label: "Years", value: 20, min: 5, max: 30, step: 1, unit: "years" },
    ],
    outputs: [
      { label: "Monthly payment", formula: "amount * (rate/1200) * (1 + rate/1200)^(years*12) / ((1 + rate/1200)^(years*12) - 1)", unit: "₹", decimals: 0 },
      { label: "Total paid", formula: "amount * (rate/1200) * (1 + rate/1200)^(years*12) / ((1 + rate/1200)^(years*12) - 1) * years * 12", unit: "₹", decimals: 0 },
      { label: "Interest", formula: "amount * (rate/1200) * (1 + rate/1200)^(years*12) / ((1 + rate/1200)^(years*12) - 1) * years * 12 - amount", unit: "₹", decimals: 0 },
    ],
    note: "A fixed rate for the whole term, paid monthly.",
  },
  timer: {
    title: "Focus session",
    phases: [
      { label: "Focus", seconds: 1500 },
      { label: "Short break", seconds: 300 },
    ],
    rounds: 4,
  },
  flashcards: {
    title: "The lab's motion values",
    cards: [
      { front: "Press feedback scale", back: "0.96, never below 0.95" },
      { front: "The ease-out curve", back: "cubic-bezier(0.23, 1, 0.32, 1)" },
      { front: "Popover enter duration", back: "About 180ms, from 0.95, out in 100ms" },
      { front: "What never animates?", back: "Keyboard-initiated actions" },
      { front: "Icon swap", back: "Scale 0.25 to 1, blur 4px to 0, spring with no bounce" },
    ],
  },
  compare: {
    before: "a4",
    after: "a1",
    before_label: "Video cube",
    after_label: "Folder maker",
    note: "Swapping the WebGL cube for the canvas-only folder keeps the hero light.",
  },
};

/** Second looks at the components with more than one form. */
export const extraSamples: { id: BlockId; title: string; data: unknown }[] = [
  {
    id: "chart",
    title: "Chart, as a line",
    data: {
      title: "Lab visitors per week",
      kind: "line",
      unit: "",
      labels: ["Sep 1", "Sep 8", "Sep 15", "Sep 22", "Sep 29", "Oct 6"],
      series: [
        { name: "Visitors", values: [820, 1140, 980, 1620, 2310, 2890] },
        { name: "Returning", values: [210, 260, 300, 410, 560, 720] },
      ],
    },
  },
  {
    id: "chart",
    title: "Chart, as an area",
    data: {
      title: "Stars on the icon set",
      kind: "area",
      unit: "",
      labels: ["Jun", "Jul", "Aug", "Sep", "Oct"],
      series: [{ name: "Stars", values: [40, 95, 180, 410, 640] }],
    },
  },
  {
    id: "chart",
    title: "Chart, stacked",
    data: {
      title: "Visits by device",
      kind: "stacked",
      unit: "",
      labels: ["Sep 8", "Sep 15", "Sep 22", "Sep 29", "Oct 6"],
      series: [
        { name: "Phone", values: [620, 540, 980, 1380, 1720] },
        { name: "Laptop", values: [430, 360, 520, 760, 940] },
        { name: "Tablet", values: [90, 80, 120, 170, 230] },
      ],
    },
  },
  {
    id: "chart",
    title: "Chart, ranked",
    data: {
      title: "Most opened pieces this month",
      kind: "ranked",
      unit: "",
      labels: ["Folder maker", "Axolotl pond", "Pixel art 3D", "Handdrawn frames", "Dia gradient", "Knob HUD"],
      series: [{ name: "Opens", values: [4120, 3890, 2210, 1960, 1180, 860] }],
    },
  },
  {
    id: "chart",
    title: "Chart, as a pie",
    data: {
      title: "Where visitors come from",
      kind: "pie",
      unit: "%",
      labels: ["X", "Direct", "Search", "GitHub", "Other"],
      series: [{ name: "Share", values: [46, 22, 15, 11, 6] }],
    },
  },
  {
    id: "chart",
    title: "Chart, as a split",
    data: {
      title: "Where the homepage's JS goes",
      kind: "split",
      unit: "KB",
      labels: ["React and Next", "Hero pieces", "Motion", "Other"],
      series: [{ name: "KB", values: [118, 46, 31, 17] }],
    },
  },
  {
    id: "options",
    title: "Options, one answer",
    data: {
      question: "How should the hero row behave on phones?",
      multiple: false,
      options: [
        { label: "Stack the three tiles", detail: "Every piece, one after another" },
        { label: "Show only the first", detail: "The rest a tap away" },
        { label: "Swipe between them", detail: "Closest to a carousel" },
      ],
    },
  },
  {
    id: "tree",
    title: "Tree, as an outline",
    data: {
      kind: "outline",
      items: [
        { name: "Homepage", depth: 0, note: "" },
        { name: "Hero row", depth: 1, note: "three live pieces" },
        { name: "Bio", depth: 1, note: "one sentence" },
        { name: "Second row", depth: 1, note: "WebGL, lazy" },
        { name: "Lab", depth: 0, note: "lab.anishfn.ink" },
      ],
    },
  },
];

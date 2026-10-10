// The components Snap can choose from. Each has one line for Snap (what it's for), a JSON schema for the writer
// (what goes in it) and, where it matters, a rule for the writer (where the data may come from). Schemas follow
// SubQ's structured-output rules: every property required, additionalProperties false on every object.
// The descriptions are what Snap tells them apart by: when it picks wrong, sharpen these first.

type Schema = Record<string, unknown>;

const str = (description?: string): Schema => (description ? { type: "string", description } : { type: "string" });
const bool = (description: string): Schema => ({ type: "boolean", description });
const num = (description: string): Schema => ({ type: "number", description });
const int = (description: string): Schema => ({ type: "integer", description });
const oneOf = (values: string[], description?: string): Schema => ({ type: "string", enum: values, ...(description && { description }) });
const arr = (items: Schema, description?: string): Schema => ({ type: "array", items, ...(description && { description }) });
const obj = (properties: Record<string, Schema>): Schema => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

const artifactRef = str('An artifact id from the conversation, like "a3", or "" when none fits.');

export const blocks = {
  text: {
    label: "Text",
    snap: "Plain prose. Conversation, explanations, opinions, short answers. The default when structure would not help.",
    schema: null,
  },
  comparison: {
    label: "Comparison",
    snap: "Choosing among several options, or picking a few of them: the candidates side by side with their images, points for and against, and which to pick.",
    schema: obj({
      options: arr(
        obj({
          title: str(),
          artifact: artifactRef,
          summary: str("One sentence."),
          points: arr(obj({ text: str("A few words."), good: bool("True for a point in favour.") })),
          picked: bool("True for the options you recommend."),
        }),
      ),
      footnote: str("One short line on how you chose, or \"\"."),
    }),
  },
  gallery: {
    label: "Gallery",
    snap: "Show images or files already shared in the conversation, each with a short caption.",
    schema: obj({
      items: arr(obj({ artifact: artifactRef, title: str(), caption: str("One short sentence.") })),
    }),
  },
  timeline: {
    label: "Timeline",
    snap: "Events in order over time: a history, how something evolved, a schedule.",
    schema: obj({
      events: arr(obj({ when: str("A short date or time label."), title: str(), detail: str("One sentence.") })),
    }),
  },
  checklist: {
    label: "Checklist",
    snap: "Tasks or requirements with done and not done: what's left, a launch list, a packing list.",
    schema: obj({
      title: str(),
      items: arr(obj({ text: str(), done: bool("True when the conversation says it's finished."), note: str('A few words, or "".') })),
    }),
  },
  decision: {
    label: "Decision",
    snap: "A yes or no answer to a single should-I question, with the reasons and a caveat. Not for choosing among several options.",
    schema: obj({
      question: str("The question, restated in a few words."),
      answer: oneOf(["yes", "no", "depends"], "The short answer."),
      verdict: str("The answer in a few words."),
      confidence: { type: "number", description: "How sure, from 0 to 1." },
      reasons: arr(str()),
      caveat: str('One line, or "".'),
    }),
  },
  table: {
    label: "Table",
    snap: "Facts to look up across several items and attributes: specs, properties, prices. When the shape or trend of numbers matters, that's a chart.",
    schema: obj({
      columns: arr(str()),
      rows: arr(arr(str()), "Each row has one cell per column."),
    }),
  },
  steps: {
    label: "Steps",
    snap: "A how-to: numbered steps to do something.",
    schema: obj({
      steps: arr(obj({ title: str("A few words, with no number in front: the component numbers the steps."), detail: str("One or two sentences.") })),
    }),
  },
  chart: {
    label: "Chart",
    snap: "Numbers whose shape matters, drawn as a graph: change over time (line, area), amounts compared or ranked (bar, ranked, stacked), shares of a whole (pie, split).",
    writer:
      "Chart only numbers stated in the conversation or its documents, or well-established public figures. Never invent or estimate data to fill a chart; if the numbers aren't known, say so in the text and leave labels and series empty.",
    schema: obj({
      title: str("What is plotted, in a few words."),
      kind: oneOf(
        ["line", "area", "bar", "stacked", "ranked", "pie", "split"],
        "line: change over time, several series. area: change over time, one series. bar: amounts side by side. stacked: amounts made of parts, per category. ranked: items ordered largest first, long names. pie: shares of one whole, up to six parts. split: shares of one whole as a single bar, any number of parts.",
      ),
      unit: str('The unit the values are in, like "KB", "%", "$" or "".'),
      labels: arr(str(), "The categories or time points, in order. For pie and split, the parts."),
      series: arr(
        obj({ name: str(), values: arr(num("One value per label, in the same order.")) }),
        "One to three series. For pie, split, ranked and area, exactly one.",
      ),
    }),
  },
  stats: {
    label: "Stats",
    snap: "Two to four headline numbers at a glance, each with its change: key figures, a summary of results, the numbers that matter right now.",
    writer: "Use only figures from the conversation, its documents or well-established public facts. Never invent a number.",
    schema: obj({
      items: arr(
        obj({
          label: str("Sentence case, no colon."),
          value: str('The figure as it should read, like "229 KB" or "3 of 6".'),
          delta: str('A signed change against something named, like "+12% vs last week", or "".'),
          direction: oneOf(["up", "down", "flat"]),
          good: bool("True when this direction is good news."),
          trend: arr(num("A past value."), "Up to 12 past values, oldest first, ending at the current one, if known; otherwise empty."),
        }),
        "Two to four items.",
      ),
    }),
  },
  map: {
    label: "Map",
    snap: "Where things are: places, venues, cities, a route or trip between stops, anything answered by locations on a map.",
    writer: "Give coordinates you're sure of, to 4 decimals. Leave out any place you can't locate precisely rather than guess.",
    schema: obj({
      places: arr(obj({ name: str(), lat: num("Latitude in degrees."), lng: num("Longitude in degrees."), note: str('A few words, or "".') })),
      route: bool("True when the places are stops in order and should be joined by a line."),
    }),
  },
  code: {
    label: "Code",
    snap: "A piece of code, a command, a config file or a snippet to copy and use.",
    writer:
      "When the code comes from a file the user shared, copy it exactly as it stands in that file: real lines only, never shortened with ... or (...), never rewritten as a sketch or with summarising comments. Choose the 15 to 40 consecutive lines that answer the question, and name the file.",
    schema: obj({
      language: str('Like "tsx", "bash", "json".'),
      filename: str('A file name if it belongs in one, or "".'),
      code: str("The code itself, complete and ready to paste."),
    }),
  },
  calendar: {
    label: "Calendar",
    snap: "Dates on a calendar: deadlines, a schedule across days, when things happen in a month, how many days are left.",
    schema: obj({
      events: arr(obj({ date: str("YYYY-MM-DD."), title: str(), note: str('A few words, or "".') })),
    }),
  },
  options: {
    label: "Options",
    snap: "The request is too open to answer well yet because it hinges on a choice only the user can make: ask one clarifying question with two to five answers to tap, instead of guessing. Not for clear how-to questions.",
    schema: obj({
      question: str("The question, short."),
      multiple: bool("True when several answers can apply at once."),
      options: arr(obj({ label: str("A short answer the user would send, in their voice."), detail: str('A few words on what it means, or "".') })),
    }),
  },
  matrix: {
    label: "Matrix",
    snap: "Weighing several items on two scales at once: effort against impact, cost against value, a 2×2 to prioritise.",
    schema: obj({
      x: obj({ label: str("The horizontal scale."), low: str("Its low end, a word or two."), high: str("Its high end.") }),
      y: obj({ label: str("The vertical scale."), low: str("Its low end."), high: str("Its high end.") }),
      quadrants: obj({
        top_left: str('A name for this corner, like "Quick wins", or "".'),
        top_right: str("Or \"\"."),
        bottom_left: str("Or \"\"."),
        bottom_right: str("Or \"\"."),
      }),
      items: arr(obj({ name: str("A few words."), x: num("0 to 1 along the horizontal scale."), y: num("0 to 1 along the vertical scale.") })),
    }),
  },
  tree: {
    label: "Tree",
    snap: "A hierarchy: a folder and file structure, a site map, an org chart, an outline of parts within parts.",
    schema: obj({
      kind: oneOf(["files", "outline"], "files for a folder and file structure, outline for anything else."),
      items: arr(
        obj({ name: str(), depth: int("0 for the top level, 1 for its children, and so on."), note: str('A few words, or "".') }),
        "In reading order, each child right after its parent.",
      ),
    }),
  },
  recipe: {
    label: "Recipe",
    snap: "Something to cook or mix: ingredients with amounts and the method, scalable to more or fewer servings.",
    schema: obj({
      title: str(),
      servings: int("How many it serves as written."),
      prep: str('Prep time, like "15 min", or "".'),
      cook: str('Cooking time, like "40 min", or "".'),
      ingredients: arr(
        obj({
          amount: num("The quantity for the servings above, or 0 for to taste."),
          unit: str('Like "g", "tbsp", "cups", or "" for a count.'),
          item: str("The ingredient, with any prep, like \"onion, finely chopped\"."),
        }),
      ),
      steps: arr(str("One step, one or two sentences.")),
    }),
  },
  quiz: {
    label: "Quiz",
    snap: "Testing knowledge or practising: multiple-choice questions to answer one at a time, with the right answer explained.",
    schema: obj({
      title: str(),
      questions: arr(
        obj({
          question: str(),
          choices: arr(str(), "Three or four choices."),
          answer: int("The index of the right choice, from 0."),
          explain: str("One or two sentences on why."),
        }),
        "Exactly as many questions as the user asked for; five when they didn't say. Never just one unless asked for one.",
      ),
    }),
  },
  itinerary: {
    label: "Itinerary",
    snap: "A plan laid out day by day with times: a trip, an event programme, a study or training schedule.",
    schema: obj({
      title: str(),
      days: arr(
        obj({
          label: str('Like "Day 1" or "Sat 18 Oct".'),
          items: arr(obj({ time: str('Like "09:00" or "Morning".'), title: str(), place: str('Where, or "".'), note: str('A few words, or "".') })),
        }),
      ),
    }),
  },
  proscons: {
    label: "Pros & cons",
    snap: "The upsides and downsides of one thing: should I do it, is it worth it, what do I gain and lose. One subject, not a comparison of several.",
    schema: obj({
      subject: str("What is being weighed, in a few words."),
      pros: arr(str("A few words.")),
      cons: arr(str("A few words.")),
      verdict: str('One line weighing them up, or "".'),
    }),
  },
  scorecard: {
    label: "Scorecard",
    snap: "Rating or reviewing something against criteria: grade my essay, score my resume, how good is this design, an audit with a score for each part.",
    schema: obj({
      subject: str("What is scored."),
      overall: num("The overall score."),
      max: num("The top of the scale, like 10 or 100."),
      criteria: arr(obj({ name: str(), score: num("On the same scale."), note: str("One line on why, and what would raise it.") })),
    }),
  },
  draft: {
    label: "Draft",
    snap: "Writing for the user to send or post: an email, a message, a reply, a post, a short note, ready to copy.",
    schema: obj({
      kind: oneOf(["email", "message", "post"]),
      to: str('The recipient, or "".'),
      subject: str('For email, or "".'),
      body: str("The full text, ready to send, with line breaks."),
    }),
  },
  links: {
    label: "Links",
    snap: "Where to go next: resources, documentation, tools, sites or reading to look at, each with why it's worth it.",
    writer: "Only link pages you are sure exist, on their real domain. Prefer official sites and documentation. Never invent a URL.",
    schema: obj({
      items: arr(obj({ title: str(), url: str("The full https URL."), note: str("One line on why it's worth it.") })),
    }),
  },
  rewrite: {
    label: "Rewrite",
    snap: "Editing text the user gave: rewrite, shorten, fix grammar, change the tone, translate, with what changed shown.",
    schema: obj({
      original: str("The user's text, exactly as given."),
      revised: str("The new version."),
      summary: str("One line on what changed."),
    }),
  },
  breakdown: {
    label: "Breakdown",
    snap: "An amount broken into line items that add up to a total: a budget, a cost estimate, a bill to split, calories in a meal, time spent.",
    writer: "Use the user's figures; where you estimate, say so in the note. The items must add up to the total.",
    schema: obj({
      title: str(),
      unit: str('Like "$", "€", "kcal", "h", or "".'),
      items: arr(obj({ label: str(), amount: num("The amount for this line."), note: str('A few words, or "".') })),
      people: int("How many people share it, or 1."),
    }),
  },
  calculator: {
    label: "Calculator",
    snap: "Working something out from numbers the user can change: a loan or EMI, a tip or split, a conversion, a what-if estimate, with sliders to try other values.",
    writer:
      "Each output's formula may use only the input ids, numbers, + - * / ^ and parentheses, and the functions min, max, round, floor, ceil, abs, sqrt, pow. Give every input a realistic starting value, range and step.",
    schema: obj({
      title: str(),
      inputs: arr(
        obj({
          id: str("A short identifier, letters only, like rate or months."),
          label: str(),
          value: num("Its starting value."),
          min: num("The slider's lowest value."),
          max: num("The slider's highest value."),
          step: num("The slider's step."),
          unit: str('Like "%", "₹", "kg", "months", or "".'),
        }),
      ),
      outputs: arr(
        obj({
          label: str(),
          formula: str("An expression over the input ids, like amount * rate / 100."),
          unit: str('Like "₹", "kg", or "".'),
          decimals: int("Digits after the decimal point, 0 to 2."),
        }),
        "One to three results; the first is the headline.",
      ),
      note: str('One line on the assumption behind it, or "".'),
    }),
  },
  timer: {
    label: "Timer",
    snap: "A countdown to start right now, or a timed sequence: steep tea for 4 minutes, a 25-minute focus session, interval training, a cooking timer.",
    schema: obj({
      title: str(),
      phases: arr(
        obj({ label: str("What happens in this phase, like Focus or Rest."), seconds: int("How long it lasts, in seconds.") }),
        "One phase for a plain countdown; several, in order, for a sequence.",
      ),
      rounds: int("How many times to run the whole sequence, at least 1."),
    }),
  },
  flashcards: {
    label: "Flashcards",
    snap: "Memorising: terms and definitions, vocabulary, facts or formulas as cards to flip through and mark as known. Not a quiz with choices.",
    schema: obj({
      title: str(),
      cards: arr(
        obj({ front: str("The prompt: a term, a word, a question."), back: str("The answer, short.") }),
        "Exactly as many cards as the user asked for; ten when they didn't say.",
      ),
    }),
  },
  compare: {
    label: "Before & after",
    snap: "Two images of the same thing compared directly with a slider: before and after, two versions of a design, an old and a new screenshot. Only when two such images are already in the conversation.",
    schema: obj({
      before: artifactRef,
      after: artifactRef,
      before_label: str('Like "Before" or "v1".'),
      after_label: str('Like "After" or "v2".'),
      note: str('What changed, in one line, or "".'),
    }),
  },
} as const;

export type BlockId = keyof typeof blocks;
export const blockIds = Object.keys(blocks) as BlockId[];

export const isBlockId = (id: string): id is BlockId => id in blocks;

/* ---------- data shapes, for the renderers (partial while streaming) ---------- */

export type ComparisonData = {
  options: { title: string; artifact: string; summary: string; points: { text: string; good: boolean }[]; picked: boolean }[];
  footnote: string;
};
export type GalleryData = { items: { artifact: string; title: string; caption: string }[] };
export type TimelineData = { events: { when: string; title: string; detail: string }[] };
export type ChecklistData = { title: string; items: { text: string; done: boolean; note: string }[] };
export type DecisionData = { question: string; answer: "yes" | "no" | "depends"; verdict: string; confidence: number; reasons: string[]; caveat: string };
export type TableData = { columns: string[]; rows: string[][] };
export type StepsData = { steps: { title: string; detail: string }[] };
export type ChartKind = "line" | "area" | "bar" | "stacked" | "ranked" | "pie" | "split";
export type ChartData = { title: string; kind: ChartKind; unit: string; labels: string[]; series: { name: string; values: number[] }[] };
export type StatsData = {
  items: { label: string; value: string; delta: string; direction: "up" | "down" | "flat"; good: boolean; trend: number[] }[];
};
export type MapData = { places: { name: string; lat: number; lng: number; note: string }[]; route: boolean };
export type CodeData = { language: string; filename: string; code: string };
export type CalendarData = { events: { date: string; title: string; note: string }[] };
export type OptionsData = { question: string; multiple: boolean; options: { label: string; detail: string }[] };
export type MatrixData = {
  x: { label: string; low: string; high: string };
  y: { label: string; low: string; high: string };
  quadrants: { top_left: string; top_right: string; bottom_left: string; bottom_right: string };
  items: { name: string; x: number; y: number }[];
};
export type TreeData = { kind: "files" | "outline"; items: { name: string; depth: number; note: string }[] };
export type RecipeData = {
  title: string;
  servings: number;
  prep: string;
  cook: string;
  ingredients: { amount: number; unit: string; item: string }[];
  steps: string[];
};
export type QuizData = { title: string; questions: { question: string; choices: string[]; answer: number; explain: string }[] };
export type ItineraryData = { title: string; days: { label: string; items: { time: string; title: string; place: string; note: string }[] }[] };
export type ProsConsData = { subject: string; pros: string[]; cons: string[]; verdict: string };
export type ScorecardData = { subject: string; overall: number; max: number; criteria: { name: string; score: number; note: string }[] };
export type DraftData = { kind: "email" | "message" | "post"; to: string; subject: string; body: string };
export type LinksData = { items: { title: string; url: string; note: string }[] };
export type RewriteData = { original: string; revised: string; summary: string };
export type CalculatorData = {
  title: string;
  inputs: { id: string; label: string; value: number; min: number; max: number; step: number; unit: string }[];
  outputs: { label: string; formula: string; unit: string; decimals: number }[];
  note: string;
};
export type TimerData = { title: string; phases: { label: string; seconds: number }[]; rounds: number };
export type FlashcardsData = { title: string; cards: { front: string; back: string }[] };
export type CompareData = { before: string; after: string; before_label: string; after_label: string; note: string };
export type BreakdownData = { title: string; unit: string; items: { label: string; amount: number; note: string }[]; people: number };

/** The writer's rule for a component, if it has one. */
export const writerRule = (id: BlockId): string | undefined => ("writer" in blocks[id] ? (blocks[id] as { writer: string }).writer : undefined);

/** Streaming JSON arrives half-built: every field may be missing, every list may be short. */
export type Streaming<T> = T extends (infer U)[] ? Streaming<U>[] : T extends object ? { [K in keyof T]?: Streaming<T[K]> } : T;

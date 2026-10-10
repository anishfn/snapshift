import "server-only";
import { blockIds, blocks, isBlockId, type BlockId } from "./blocks";
import { decide, SubqError, type Answer, type Question } from "./subq";
import type { Decision, TurnRequest } from "./types";

// One Snap call per turn. Everything goes into state, nothing is summarized away: the whole transcript, every
// artifact, the text of every document. Snap answers five kinds of question at once: which component, whether the
// reply needs more components beside it, which earlier message it depends on, which artifacts to bring back, and
// how deep to go.

const MAX_RECALL_OPTIONS = 254; // a choice takes up to 255 options; one is "none"
/**
 * With a few files, Snap answers yes or no for each: exact, and it can say yes to several. With many, that is
 * the slow part of the call (measured at 130k tokens: 54 yes/no questions 5.5s, one choice over the same 54 files
 * 1.8s with 96% on the right one), so it ranks them all in a single choice instead.
 */
const MAX_ARTIFACT_QUESTIONS = 12;
const MAX_FILE_OPTIONS = 254;
/** From the ranking, a file is brought back when Snap gives it at least this much. */
const FILE_FLOOR = 0.12;
const MAX_FILES = 6;
/** A reply shows at most this many components beside the main one: each makes the writer's reply longer. */
export const MAX_EXTRAS = 2;
/**
 * An extra component is added when Snap gives it at least EXTRA_FLOOR of "what else?", and only when it is nearly
 * sure something else was asked for at all. Measured on 24 questions: when the user really asked for two things
 * "none" got 1 to 12%; when they asked for one, 25 to 93% (a verdict beside pros and cons, code beside steps:
 * handy, but not asked for).
 */
const EXTRA_FLOOR = 0.3;
const NONE_CEILING = 0.2;
const DEPTHS = ["One line", "A short paragraph", "A detailed answer", "A thorough answer"];

const age = (at: number, now: number) => {
  const m = Math.round((now - at) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
};

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

export function buildState(req: TurnRequest) {
  const now = Date.now();
  const latest = req.messages[req.messages.length - 1];
  const earlier = req.messages.slice(0, -1);
  const imageIds = req.images.map((i) => i.id);
  return {
    new_message: { id: latest.id, text: latest.text, attachments: latest.artifacts ?? [] },
    conversation: earlier.map((m, i) => ({
      id: m.id,
      number: i + 1,
      role: m.role,
      when: age(m.at, now),
      text: m.text,
      ...(m.artifacts?.length && { attachments: m.artifacts }),
      ...(m.component && m.component !== "text" && { shown_as: m.component, shown_data: m.data }),
      ...(m.extras?.length && { also_shown: m.extras.map((e) => ({ as: e.component, data: e.data })) }),
    })),
    artifacts: req.artifacts.map((a) => ({
      id: a.id,
      kind: a.kind,
      name: a.name,
      ...(a.caption && { caption: a.caption }),
      ...(a.source && { from: a.source.label }),
      ...(a.tags && { snap_tags: { kind: a.tags.kind, dark: a.tags.dark > 0.5, has_text: a.tags.hasText > 0.5 } }),
    })),
    documents: req.artifacts.filter((a) => a.kind === "doc" && a.text).map((a) => ({ id: a.id, name: a.name, text: a.text })),
    attached_images: imageIds.length ? `The images attached to this request are, in order: ${imageIds.join(", ")}.` : "No images attached.",
  };
}

export function buildQuestions(req: TurnRequest, artifactLimit = MAX_ARTIFACT_QUESTIONS): Record<string, Question> {
  const earlier = req.messages.slice(0, -1);

  const recall: Record<string, string | null> = {
    none: "The reply doesn't depend on anything said earlier, or only on the last couple of messages.",
  };
  earlier.slice(-MAX_RECALL_OPTIONS).forEach((m) => {
    recall[m.id] = `${m.role}: ${clip(m.text.replace(/\s+/g, " "), 120)}`;
  });

  const questions: Record<string, Question> = {
    component: {
      type: "choice",
      instructions:
        "Which interface component best presents the reply to new_message? Choose structure only when it clearly helps the reader; otherwise text.",
      criteria: Object.fromEntries(blockIds.map((id) => [id, blocks[id].snap])),
    },
    // The component choice names one winner. This asks what else belongs in the same reply; its probabilities
    // spread over everything that's needed, so "a plan, a map and a budget" lights up two of them.
    also: {
      type: "choice",
      instructions:
        "Did the user explicitly ask for more than one kind of thing in new_message (for example a plan and a map, a table and a chart, a recipe and a timer)? If so, which other component does the reply need next to its main one? Only count things the user asked for in words. A component that would show the same answer another way, or that might merely be handy, does not count. Most replies need none.",
      criteria: {
        none: "The user asked for one thing. One component (or plain text) answers it, and a second would only repeat it or add something not asked for.",
        ...Object.fromEntries(blockIds.filter((id) => id !== "text").map((id) => [id, blocks[id].snap])),
      },
    },
    depth: {
      type: "score",
      instructions: "How long should the written part of the reply to new_message be?",
      criteria: DEPTHS,
    },
  };

  // A choice needs two options or more, so there's nothing to recall on a conversation's first message.
  if (earlier.length) {
    questions.recall = {
      type: "choice",
      instructions:
        "Which single earlier message holds something the reply to new_message must rely on: a constraint, preference, fact or decision stated before? Look across the whole conversation, not only the recent part.",
      criteria: recall,
    };
  }

  if (req.artifacts.length > MAX_ARTIFACT_QUESTIONS) {
    questions.files = {
      type: "choice",
      instructions:
        "Which shared file does the reply to new_message rely on, or need to show? Choose the one it needs most. If the reply needs no file at all, choose none.",
      criteria: {
        none: "The reply doesn't need any of the shared files.",
        ...Object.fromEntries(req.artifacts.slice(-MAX_FILE_OPTIONS).map((a) => [a.id, `${a.kind} "${a.name}"${a.caption ? `: ${clip(a.caption, 100)}` : ""}`])),
      },
    };
    return questions;
  }

  // Newest artifacts first: they're the likeliest to matter, and the list has to stop somewhere.
  [...req.artifacts]
    .reverse()
    .slice(0, artifactLimit)
    .forEach((a) => {
      questions[`use_${a.id}`] = {
        type: "noul",
        instructions: `Should artifact ${a.id} (${a.kind}, "${a.name}"${a.caption ? `: ${clip(a.caption, 100)}` : ""}) be shown or used in the reply to new_message?`,
        criteria: {
          true: "The reply shows it, compares it, or relies on its contents",
          false: "The reply doesn't need it",
        },
      };
    });

  return questions;
}

function read(answers: Record<string, Answer>, req: TurnRequest) {
  const component = answers.component;
  const recall = answers.recall;
  const depth = answers.depth;
  if (component?.type !== "choice" || (recall && recall.type !== "choice") || depth?.type !== "score") {
    throw new SubqError("Snap answered in a shape this app doesn't expect.", 500);
  }
  const ranked = answers.files?.type === "choice" ? answers.files.probabilities : null;
  const picked = (
    ranked
      ? Object.entries(ranked)
          .filter(([id, p]) => id !== "none" && p >= FILE_FLOOR)
          .sort(([, a], [, b]) => b - a)
          .slice(0, MAX_FILES)
          .map(([id]) => id)
      : Object.entries(answers)
          .filter(([k, a]) => k.startsWith("use_") && a.type === "noul" && a.noul > 0.5)
          .sort(([, a], [, b]) => (b as { noul: number }).noul - (a as { noul: number }).noul)
          .map(([k]) => k.slice(4))
  ).filter((id) => req.artifacts.some((a) => a.id === id));

  let main = isBlockId(component.choice) ? component.choice : "text";
  let confidence = component.confidence;
  const also = answers.also?.type === "choice" ? answers.also.probabilities : {};
  const extras = Object.entries(also)
    .filter(([id, p]) => (also.none ?? 1) < NONE_CEILING && id !== "none" && id !== "text" && id !== main && isBlockId(id) && p >= EXTRA_FLOOR)
    .sort(([, a], [, b]) => b - a)
    .map(([id, p]) => ({ id: id as BlockId, p }));
  // Plain text beside a component is just the prose: the first extra becomes the main component.
  if (main === "text" && extras.length) {
    const first = extras.shift()!;
    main = first.id;
    confidence = first.p;
  }

  return {
    component: main,
    confidence,
    probabilities: component.probabilities,
    extras: extras.slice(0, MAX_EXTRAS).map((e) => e.id),
    extraProbabilities: also,
    recall: recall?.type === "choice" && recall.choice !== "none" ? recall.choice : null,
    recallConfidence: recall?.type === "choice" ? recall.confidence : 0,
    artifacts: picked,
    depth: Math.round(depth.score),
  } as const;
}

export async function decideTurn(req: TurnRequest, signal?: AbortSignal): Promise<Decision> {
  const state = buildState(req);
  const images = req.images.map(({ mediaType, base64 }) => ({ mediaType, base64 }));
  let result;
  try {
    result = await decide({ state, questions: buildQuestions(req), images, signal });
  } catch (e) {
    // Too many questions or options for Snap: ask again with fewer artifact questions.
    if (!(e instanceof SubqError) || e.status !== 422 || req.artifacts.length <= 6) throw e;
    result = await decide({ state, questions: buildQuestions(req, 6), images, signal });
  }
  return { ...read(result.answers, req), ms: result.ms, inputTokens: result.usage.input_tokens, images: images.length };
}

/* ---------- describing an image as it arrives ---------- */

const IMAGE_KINDS = {
  ui_screenshot: "A screenshot of an app, website or interface",
  chart: "A chart, graph or dashboard",
  photo: "A photograph of the real world",
  illustration: "A drawing, render, icon or artwork",
  document: "A scan or photo of a page, receipt or slide",
  diagram: "A diagram, flowchart or whiteboard",
  other: null,
};

export async function describeImage(input: { name: string; note: string; mediaType: string; base64: string; signal?: AbortSignal }) {
  const result = await decide({
    state: { file_name: input.name, user_note: input.note || "(none)" },
    images: [{ mediaType: input.mediaType, base64: input.base64 }],
    questions: {
      kind: { type: "choice", instructions: "What kind of image is this?", criteria: IMAGE_KINDS },
      dark: {
        type: "noul",
        instructions: "Is the image mostly dark?",
        criteria: { true: "Dark background or dark overall", false: "Light background or light overall" },
      },
      has_text: {
        type: "noul",
        instructions: "Does the image contain readable text?",
        criteria: { true: "Words or numbers can be read", false: "No readable text" },
      },
    },
    signal: input.signal,
  });
  const a = result.answers;
  return {
    kind: a.kind?.type === "choice" ? a.kind.choice : "other",
    dark: a.dark?.type === "noul" ? a.dark.noul : 0,
    hasText: a.has_text?.type === "noul" ? a.has_text.noul : 0,
    ms: result.ms,
  };
}

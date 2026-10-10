import type { BlockId } from "./blocks";

/** What Snap said about an image when it arrived: it can't caption, so it answers typed questions instead. */
export type ImageTags = {
  kind: string;
  dark: number;
  hasText: number;
  ms: number;
};

export type Artifact = {
  id: string;
  kind: "image" | "doc";
  name: string;
  mediaType: string;
  /** Images: a data URL or a public path. */
  src?: string;
  /** Written by hand for the demo; uploads only get Snap's tags. */
  caption?: string;
  tags?: ImageTags;
  /** Where it was brought in from, when not from this device: files from one repository share a label. */
  source?: { kind: "github" | "page"; label: string; url: string };
  /** Text documents (md, txt, csv, json): the text itself, so Snap sees it too. */
  text?: string;
  /** Binary documents (pdf): base64 for the writer. */
  base64?: string;
  bytes: number;
};

export type Decision = {
  component: BlockId;
  confidence: number;
  probabilities: Record<string, number>;
  /** Components Snap wants beside the main one, because the question asked for more than one kind of thing. */
  extras?: BlockId[];
  /** Snap's answer to "what else?", over every component and "none". */
  extraProbabilities?: Record<string, number>;
  /** The earlier message Snap says the reply depends on, or null. */
  recall: string | null;
  recallConfidence: number;
  /** Artifacts Snap wants shown or used, most likely first. */
  artifacts: string[];
  depth: number;
  ms: number;
  inputTokens: number;
  images: number;
};

export type Turn = {
  status: "deciding" | "writing" | "done" | "error";
  decision?: Decision;
  /** The component's data, filled in as it streams. */
  data?: unknown;
  error?: string;
  writeMs?: number;
  /** The model that wrote the reply, credited in "How Snap decided". */
  writer?: string;
};

export type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
  at: number;
  artifacts?: string[];
  /** Live assistant turns. Seeded demo replies have a component but no turn: Snap didn't make them. */
  turn?: Turn;
  component?: BlockId;
  data?: unknown;
  /** More components in the same reply, under the main one. */
  extras?: { component: BlockId; data?: unknown }[];
  seeded?: boolean;
};

export type Conversation = {
  /** Empty until the first message, so a blank new chat never lands in the history. */
  id: string;
  updatedAt: number;
  title: string;
  messages: Message[];
  artifacts: Record<string, Artifact>;
  /** Snap's last measured input, the honest number for the meter. */
  lastInputTokens?: number;
};

/** A conversation as the sidebar lists it. */
export type Summary = { id: string; title: string; updatedAt: number; demo?: boolean };

/** What the browser sends for a turn. Images travel only when Snap will look at them. */
export type TurnRequest = {
  messages: Pick<Message, "id" | "role" | "text" | "at" | "artifacts" | "component" | "data" | "extras">[];
  artifacts: Omit<Artifact, "src">[];
  images: { id: string; mediaType: string; base64: string }[];
};

export type TurnEvent =
  | { type: "decision"; decision: Decision }
  | { type: "partial"; text: string; data?: unknown; extras?: unknown[] }
  | { type: "done"; text: string; data?: unknown; extras?: unknown[]; writeMs: number; writer?: string }
  | { type: "error"; message: string; stage: "decide" | "write" };

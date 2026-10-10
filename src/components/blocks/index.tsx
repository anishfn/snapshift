"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, type ComponentType } from "react";
import {
  BoltIcon,
  BookmarkIcon,
  BucketIcon,
  CalculatorIcon,
  CalendarIcon,
  ChatIcon,
  CheckIcon,
  ChecklistIcon,
  ClipboardIcon,
  EyeIcon,
  FolderIcon,
  ForwardIcon,
  GlobeIcon,
  HeartIcon,
  ImageIcon,
  LinkIcon,
  MailIcon,
  MarkerIcon,
  PlaneIcon,
  PollIcon,
  SpacesIcon,
  SparkleIcon,
  StarIcon,
  TabIcon,
  TargetIcon,
  TimerIcon,
  ViewfinderIcon,
  WalletIcon,
} from "@/components/icons";
import { type BlockId, blocks } from "@/lib/blocks";
import { easeOut } from "@/lib/motion";
import { Breakdown, BreakdownSkeleton, breakdownText } from "./breakdown";
import { Calendar, CalendarSkeleton, calendarText } from "./calendar";
import { Chart, ChartSkeleton, chartText } from "./chart";
import { Comparison, ComparisonSkeleton, comparisonText } from "./comparison";
import { decisionText, Table, TableSkeleton, tableText, Verdict, VerdictSkeleton } from "./facts";
import { Gallery, GallerySkeleton } from "./gallery";
import { Itinerary, ItinerarySkeleton, itineraryText } from "./itinerary";
import { Checklist, ChecklistSkeleton, checklistText, Steps, StepsSkeleton, stepsText, Timeline, TimelineSkeleton, timelineText } from "./lists";
import { MapBlock, MapSkeleton, mapText } from "./map";
import { Matrix, MatrixSkeleton, matrixText } from "./matrix";
import { Quiz, QuizSkeleton, quizText } from "./quiz";
import { Recipe, RecipeSkeleton, recipeText } from "./recipe";
import { Code, CodeSkeleton, Options, OptionsSkeleton, Stats, StatsSkeleton, statsText, Tree, TreeSkeleton, treeText } from "./simple";
import { ProsCons, ProsConsSkeleton, prosConsText, Scorecard, ScorecardSkeleton, scorecardText } from "./weigh";
import { Draft, DraftSkeleton, draftText, Links, LinksSkeleton, linksText, Rewrite, RewriteSkeleton, rewriteText } from "./write";
import { Calculator, CalculatorSkeleton, calculatorText } from "./calculator";
import { Compare, CompareSkeleton, compareText } from "./compare";
import { Flashcards, FlashcardsSkeleton, flashcardsText } from "./flashcards";
import { Timer, TimerSkeleton, timerText } from "./timer";

import { CopyAction, Swap, ToolsSlot } from "./shared";

export { ArtifactsContext, ChatActionsContext } from "./shared";

/* eslint-disable @typescript-eslint/no-explicit-any -- streamed data is checked field by field inside each block */
type View = {
  View: (p: { data: any; settled: boolean; answer?: string; onChange?: (d: unknown) => void }) => React.ReactNode;
  Skeleton: () => React.ReactNode;
  /** Enough has arrived to show the real thing instead of its skeleton. */
  ready: (d: any) => boolean;
  /** The block as plain text, for Copy under the reply and in the card's top bar. */
  text?: (d: any) => string;
  /** The component's own icon in the card's top bar. */
  icon: ComponentType<{ size?: number; className?: string }>;
  /** A short detail beside the name in the top bar: "5 rows", "3 questions", "hero.tsx". */
  meta?: (d: any) => string | undefined;
};

const count = (n: number | undefined, one: string, many = `${one}s`) => (n ? `${n} ${n === 1 ? one : many}` : undefined);
const CHART_KIND: Record<string, string> = { line: "Line", area: "Area", bar: "Bar", stacked: "Stacked bars", ranked: "Ranked", pie: "Pie", split: "Split" };

const views: Record<Exclude<BlockId, "text">, View> = {
  comparison: { View: Comparison, Skeleton: ComparisonSkeleton, ready: (d) => !!d?.options?.length, text: comparisonText, icon: EyeIcon, meta: (d) => count(d?.options?.length, "option") },
  gallery: { View: Gallery, Skeleton: GallerySkeleton, ready: (d) => !!d?.items?.length, icon: ImageIcon, meta: (d) => count(d?.items?.length, "item") },
  timeline: { View: Timeline, Skeleton: TimelineSkeleton, ready: (d) => !!d?.events?.length, text: timelineText, icon: ForwardIcon, meta: (d) => count(d?.events?.length, "event") },
  checklist: { View: Checklist, Skeleton: ChecklistSkeleton, ready: (d) => !!d?.items?.length || !!d?.title, text: checklistText, icon: ChecklistIcon },
  decision: { View: Verdict, Skeleton: VerdictSkeleton, ready: (d) => !!d?.verdict, text: decisionText, icon: CheckIcon },
  table: { View: Table, Skeleton: TableSkeleton, ready: (d) => !!d?.columns?.length, text: tableText, icon: SpacesIcon, meta: (d) => count(d?.rows?.length, "row") },
  steps: { View: Steps, Skeleton: StepsSkeleton, ready: (d) => !!d?.steps?.length, text: stepsText, icon: ClipboardIcon, meta: (d) => count(d?.steps?.length, "step") },
  chart: { View: Chart, Skeleton: ChartSkeleton, ready: (d) => !!d?.labels?.length && !!d?.series?.[0]?.values?.length, text: chartText, icon: PollIcon, meta: (d) => CHART_KIND[d?.kind] },
  stats: { View: Stats, Skeleton: StatsSkeleton, ready: (d) => !!d?.items?.[0]?.value, text: statsText, icon: BoltIcon },
  map: { View: MapBlock, Skeleton: MapSkeleton, ready: (d) => typeof d?.places?.[0]?.lng === "number", text: mapText, icon: GlobeIcon, meta: (d) => (d?.route ? count(d?.places?.length, "stop") : count(d?.places?.length, "place")) },
  code: { View: Code, Skeleton: CodeSkeleton, ready: (d) => !!d?.code, text: (d) => d?.code ?? "", icon: TabIcon, meta: (d) => d?.filename || d?.language },
  calendar: {
    View: Calendar,
    Skeleton: CalendarSkeleton,
    ready: (d) => /^\d{4}-\d{2}-\d{2}$/.test(d?.events?.[0]?.date ?? "") && !!d?.events?.[0]?.title,
    text: calendarText, icon: CalendarIcon, meta: (d) => count(d?.events?.length, "event") },
  options: { View: Options, Skeleton: OptionsSkeleton, ready: (d) => !!d?.options?.length, icon: ChatIcon, meta: (d) => (d?.multiple ? "Pick any" : "Pick one") },
  matrix: { View: Matrix, Skeleton: MatrixSkeleton, ready: (d) => typeof d?.items?.[0]?.y === "number", text: matrixText, icon: TargetIcon, meta: (d) => count(d?.items?.length, "item") },
  tree: { View: Tree, Skeleton: TreeSkeleton, ready: (d) => !!d?.items?.length, text: treeText, icon: FolderIcon, meta: (d) => (d?.kind === "files" ? "Files" : "Outline") },
  recipe: { View: Recipe, Skeleton: RecipeSkeleton, ready: (d) => !!d?.ingredients?.length, text: recipeText, icon: BucketIcon, meta: (d) => (d?.prep || d?.cook ? [d.prep && `prep ${d.prep}`, d.cook && `cook ${d.cook}`].filter(Boolean).join(", ") : undefined) },
  quiz: { View: Quiz, Skeleton: () => <QuizSkeleton />, ready: (d) => !!d?.questions?.[0]?.choices?.length, text: quizText, icon: SparkleIcon, meta: (d) => count(d?.questions?.length, "question") },
  itinerary: { View: Itinerary, Skeleton: ItinerarySkeleton, ready: (d) => !!d?.days?.[0]?.items?.length, text: itineraryText, icon: PlaneIcon, meta: (d) => count(d?.days?.length, "day") },
  proscons: { View: ProsCons, Skeleton: ProsConsSkeleton, ready: (d) => !!d?.pros?.length || !!d?.cons?.length, text: prosConsText, icon: HeartIcon, meta: (d) => (d?.pros || d?.cons ? `${d?.pros?.length ?? 0} for, ${d?.cons?.length ?? 0} against` : undefined) },
  scorecard: { View: Scorecard, Skeleton: ScorecardSkeleton, ready: (d) => typeof d?.criteria?.[0]?.score === "number", text: scorecardText, icon: StarIcon, meta: (d) => count(d?.criteria?.length, "criterion", "criteria") },
  draft: { View: Draft, Skeleton: DraftSkeleton, ready: (d) => !!d?.body, text: draftText, icon: MailIcon, meta: (d) => ({ email: "Email", message: "Message", post: "Post" })[d?.kind as string] },
  links: { View: Links, Skeleton: LinksSkeleton, ready: (d) => /^https?:\/\/.+\..+/.test(d?.items?.[0]?.url ?? ""), text: linksText, icon: LinkIcon, meta: (d) => count(d?.items?.length, "link") },
  rewrite: { View: Rewrite, Skeleton: RewriteSkeleton, ready: (d) => !!d?.revised, text: rewriteText, icon: MarkerIcon },
  breakdown: { View: Breakdown, Skeleton: BreakdownSkeleton, ready: (d) => typeof d?.items?.[0]?.amount === "number", text: breakdownText, icon: WalletIcon, meta: (d) => count(d?.items?.length, "item") },
  calculator: {
    View: Calculator,
    Skeleton: CalculatorSkeleton,
    ready: (d) => typeof d?.inputs?.[0]?.max === "number" && !!d?.outputs?.[0]?.formula,
    text: calculatorText,
    icon: CalculatorIcon,
    meta: (d) => count(d?.inputs?.length, "input"),
  },
  timer: {
    View: Timer,
    Skeleton: TimerSkeleton,
    ready: (d) => typeof d?.phases?.[0]?.seconds === "number",
    text: timerText,
    icon: TimerIcon,
    meta: (d) => {
      const s = (d?.phases ?? []).reduce((t: number, p: { seconds?: number }) => t + (p?.seconds ?? 0), 0) * Math.max(1, d?.rounds ?? 1);
      return s ? `${Math.round(s / 60)} min in all` : undefined;
    },
  },
  flashcards: { View: Flashcards, Skeleton: FlashcardsSkeleton, ready: (d) => !!d?.cards?.[0]?.back, text: flashcardsText, icon: BookmarkIcon, meta: (d) => count(d?.cards?.length, "card") },
  compare: {
    View: Compare,
    Skeleton: CompareSkeleton,
    ready: (d) => !!d?.before && !!d?.after,
    text: compareText,
    icon: ViewfinderIcon,
    meta: (d) => (d?.before_label && d?.after_label ? `${d.before_label} and ${d.after_label}` : undefined),
  },
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Whether a component's data arrived complete enough to show. */
export function blockReady(id: BlockId, data: unknown) {
  return id === "text" || (!!data && views[id].ready(data));
}

/** A component as plain text, for copying a whole reply. */
export function blockText(id: BlockId, data: unknown) {
  if (id === "text" || !data) return "";
  const v = views[id];
  return v.ready(data) ? (v.text?.(data) ?? "") : "";
}

/**
 * The component Snap chose. Its skeleton holds the shape from the moment the decision lands; the real thing
 * blur-fades in over it once the writer's first items arrive. Text needs no block.
 */
export function Block({
  id,
  data,
  settled,
  answer,
  onChange,
}: {
  id: BlockId;
  data: unknown;
  settled: boolean;
  answer?: string;
  onChange?: (data: unknown) => void;
}) {
  // the slot the view's own tools are portalled into; a state setter so the view re-renders once it exists
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  if (id === "text") return null;
  const { View, Skeleton, ready, icon: Icon, meta, text } = views[id];
  const show = ready(data);
  // Finished with nothing to show: say nothing rather than leave a skeleton behind.
  if (settled && !show) return null;
  const detail = show ? meta?.(data) : undefined;
  return (
    <div className="rounded-[20px] bg-raised shadow-surface">
      {/* The top bar every component shares: what it is, a detail, its own tools, and Copy, always in one place. */}
      <div className="flex h-11 items-center justify-between gap-3 ps-4 pe-2">
        <span className="flex min-w-0 items-center gap-2 text-[12px]">
          <Icon size={14} className="shrink-0 text-fg-4" />
          <span className="shrink-0 font-medium text-fg-3">{blocks[id].label}</span>
          {detail && (
            <>
              <span aria-hidden className="text-fg-6">
                ·
              </span>
              <Swap value={detail} className="truncate text-fg-5 tabular-nums" />
            </>
          )}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          <div ref={setSlot} className="flex items-center gap-0.5" />
          <AnimatePresence initial={false}>
            {settled && show && text && (
              <motion.span
                className="flex"
                initial={{ opacity: 0, filter: "blur(4px)" }}
                animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 0.2, ease: easeOut } }}
              >
                <CopyAction showLabel={false} label={`Copy ${blocks[id].label.toLowerCase()}`} text={() => text(data)} />
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
      <div className="grid px-2 pb-2">
        <ToolsSlot value={slot}>
          <AnimatePresence initial={false}>
            <motion.div
              key={show ? "view" : "skeleton"}
              className="col-start-1 row-start-1 min-w-0"
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              transition={{ duration: 0.3, ease: easeOut }}
            >
              {show ? <View data={data} settled={settled} answer={answer} onChange={onChange} /> : <Skeleton />}
            </motion.div>
          </AnimatePresence>
        </ToolsSlot>
      </div>
    </div>
  );
}

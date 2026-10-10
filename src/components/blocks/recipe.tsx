"use client";

import { useState } from "react";
import { MinusIcon, PlusIcon, TimerIcon, UsersIcon } from "@/components/icons";
import type { RecipeData } from "@/lib/blocks";
import { Action, Arrive, Bar, BlockHeader, type BlockProps, CopyAction, finite, Swap } from "./shared";

// A recipe you can cook from: change the servings and every amount scales (spoons and cups in kitchen fractions,
// grams to sensible round numbers); tick ingredients off as you gather them; the method is numbered.

const FRACTIONS: [number, string][] = [
  [0.125, "⅛"],
  [0.25, "¼"],
  [1 / 3, "⅓"],
  [0.5, "½"],
  [2 / 3, "⅔"],
  [0.75, "¾"],
];
const KITCHEN = /^(cups?|tbsp|tsp|tablespoons?|teaspoons?|)$/i;

/** 1.5 cups → "1½", 333 g → "335", 0 → "to taste". */
function amount(v: number, unit: string) {
  if (!v) return "";
  if (KITCHEN.test(unit.trim())) {
    const whole = Math.floor(v);
    const rest = v - whole;
    const [frac, glyph] = FRACTIONS.reduce((best, f) => (Math.abs(f[0] - rest) < Math.abs(best[0] - rest) ? f : best), [0, ""] as [number, string]);
    if (Math.abs(frac - rest) < 0.07) return whole ? `${whole}${glyph}` : glyph || "0";
    if (rest > 0.93) return `${whole + 1}`;
    return +v.toFixed(1) + "";
  }
  if (v >= 100) return `${Math.round(v / 5) * 5}`;
  if (v >= 10) return `${Math.round(v)}`;
  return `${+v.toFixed(1)}`;
}

type RecipeState = RecipeData & { got?: number[] };

export function Recipe({ data, settled, onChange }: BlockProps<RecipeState>) {
  const base = finite(data.servings) && data.servings > 0 ? data.servings : 1;
  const [servings, setServings] = useState<number | null>(null);
  const n = servings ?? base;
  const factor = n / base;
  const got = new Set((data.got ?? []).filter((x): x is number => typeof x === "number"));
  const ingredients = (data.ingredients ?? []).filter((i) => i?.item);
  const steps = (data.steps ?? []).filter((s): s is string => !!s);

  const toggle = (i: number) => {
    if (!settled || !onChange) return;
    const next = new Set(got);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    onChange({ ...data, got: [...next] });
  };

  const line = (i: (typeof ingredients)[number]) => {
    const a = amount((i?.amount ?? 0) * factor, i?.unit ?? "");
    return { qty: a ? `${a}${i?.unit ? ` ${i.unit}` : ""}` : "to taste", item: i?.item ?? "" };
  };

  return (
    <div className="flex flex-col gap-4 px-2 py-1">
      <BlockHeader title={data.title}>
        <CopyAction label="Shopping list" text={() => [`${data.title} (serves ${n})`, ...ingredients.map((i) => `- ${line(i).qty} ${line(i).item}`)].join("\n")} />
      </BlockHeader>
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-fg-3">
        {data.prep && (
          <span className="flex h-7 items-center gap-1.5 rounded-[8px] bg-surface px-2">
            <TimerIcon size={13} className="text-fg-5" /> Prep {data.prep}
          </span>
        )}
        {data.cook && (
          <span className="flex h-7 items-center gap-1.5 rounded-[8px] bg-surface px-2">
            <TimerIcon size={13} className="text-fg-5" /> Cook {data.cook}
          </span>
        )}
        {/* servings: the one control that changes everything below it */}
        <span className="flex h-7 items-center gap-0.5 rounded-[8px] bg-surface ps-2 pe-0.5">
          <UsersIcon size={13} className="me-1 text-fg-5" />
          <span className="min-w-[4.5rem] text-fg-2 tabular-nums">
            Serves <Swap value={n} className="text-fg" />
          </span>
          <Action showLabel={false} label="Fewer servings" icon={<MinusIcon size={13} />} onClick={() => setServings(Math.max(1, n - 1))} />
          <Action showLabel={false} label="More servings" icon={<PlusIcon size={13} />} onClick={() => setServings(Math.min(48, n + 1))} />
        </span>
        {servings !== null && servings !== base && (
          <button type="button" onClick={() => setServings(null)} className="focus-ring rounded-[6px] px-1 text-fg-5 hover:text-fg-2">
            Reset to {base}
          </button>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className="flex flex-col gap-1.5">
          <h4 className="text-[12px] text-fg-4">
            Ingredients{got.size > 0 && <span className="tabular-nums"> · {got.size} of {ingredients.length} ready</span>}
          </h4>
          <ul className="-mx-1.5 flex flex-col">
            {ingredients.map((ing, i) => {
              const { qty, item } = line(ing);
              const on = got.has(i);
              return (
                <Arrive as="li" key={i}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    disabled={!settled || !onChange}
                    onClick={() => toggle(i)}
                    className={`focus-ring flex w-full items-baseline gap-2.5 rounded-[8px] px-1.5 py-1 text-start text-[13px] transition-[background-color,opacity] duration-200 ease-out enabled:hover:bg-white/[0.04] enabled:active:bg-white/[0.07] ${on ? "opacity-45" : ""}`}
                  >
                    {/* the amount blur-swaps when the servings change; the strike fades in when it's ticked */}
                    <Swap
                      value={qty}
                      className={`w-16 shrink-0 text-end text-fg tabular-nums line-through transition-[text-decoration-color] duration-200 ${on ? "decoration-fg-5" : "decoration-transparent"}`}
                    />
                    <span className={`text-fg-2 line-through transition-[text-decoration-color] duration-200 ${on ? "decoration-fg-6" : "decoration-transparent"}`}>{item}</span>
                  </button>
                </Arrive>
              );
            })}
          </ul>
        </section>
        <section className="flex flex-col gap-1.5">
          <h4 className="text-[12px] text-fg-4">Method</h4>
          <ol className="flex flex-col gap-2.5">
            {steps.map((s, i) => (
              <Arrive as="li" key={i} className="flex gap-2.5 text-[14px] leading-relaxed text-fg-2">
                <span className="w-4 shrink-0 text-end font-medium text-fg tabular-nums">{i + 1}</span>
                <span className="text-pretty">{s}</span>
              </Arrive>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

export const recipeText = (d: BlockProps<RecipeData>["data"]) =>
  [
    `${d.title} (serves ${d.servings})`,
    ...(d.ingredients ?? []).map((i) => `- ${i?.amount ? `${i.amount} ${i.unit ?? ""} ` : ""}${i?.item}`),
    "",
    ...(d.steps ?? []).map((s, i) => `${i + 1}. ${s}`),
  ].join("\n");

export function RecipeSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-2 py-1">
      <Bar className="h-3.5 w-1/3" />
      <div className="flex gap-2">
        <Bar className="h-7 w-24" />
        <Bar className="h-7 w-24" />
        <Bar className="h-7 w-32" />
      </div>
      <div className="grid gap-5 sm:grid-cols-[2fr_3fr]">
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <Bar key={i} className="h-3 w-4/5" />
          ))}
        </div>
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <Bar key={i} className="h-3 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

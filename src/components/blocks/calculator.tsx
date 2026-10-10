"use client";

import { useState } from "react";
import type { CalculatorData } from "@/lib/blocks";
import { format } from "./chart";
import { Arrive, Bar, BlockHeader, type BlockProps, finite, Swap } from "./shared";

// Numbers you can play with: each input is a slider with a number field beside it, and the results recalculate as
// you drag. The writer's formulas are read by a small parser below (numbers, the input ids, + - * / ^, brackets and
// a few named functions); nothing is ever run as code.

/* ---------- a safe little expression reader ---------- */

const FUNCS: Record<string, (...a: number[]) => number> = {
  min: Math.min,
  max: Math.max,
  round: (x) => Math.round(x),
  floor: Math.floor,
  ceil: Math.ceil,
  abs: Math.abs,
  sqrt: Math.sqrt,
  pow: Math.pow,
};

/** Evaluates `expr` with `vars`; NaN for anything it doesn't understand. Recursive descent, no eval. */
export function evaluate(expr: string, vars: Record<string, number>): number {
  const tokens = expr.match(/\d+(?:\.\d+)?(?:e[-+]?\d+)?|[A-Za-z_]\w*|[-+*/^(),]|\S/g) ?? [];
  let i = 0;
  const peek = () => tokens[i];
  const take = () => tokens[i++];
  const expression = (): number => {
    let v = term();
    while (peek() === "+" || peek() === "-") v = take() === "+" ? v + term() : v - term();
    return v;
  };
  const term = (): number => {
    let v = power();
    while (peek() === "*" || peek() === "/") v = take() === "*" ? v * power() : v / power();
    return v;
  };
  const power = (): number => {
    const base = unary();
    return peek() === "^" ? (take(), base ** power()) : base;
  };
  const unary = (): number => (peek() === "-" ? (take(), -unary()) : peek() === "+" ? (take(), unary()) : primary());
  const primary = (): number => {
    const t = take();
    if (t === undefined) return NaN;
    if (/^\d/.test(t)) return Number(t);
    if (t === "(") {
      const v = expression();
      return take() === ")" ? v : NaN;
    }
    if (/^[A-Za-z_]/.test(t)) {
      if (peek() === "(") {
        take();
        const args: number[] = [];
        if (peek() !== ")") {
          args.push(expression());
          while (peek() === ",") {
            take();
            args.push(expression());
          }
        }
        if (take() !== ")") return NaN;
        const f = FUNCS[t.toLowerCase()];
        return f ? f(...args) : NaN;
      }
      return t in vars ? vars[t] : NaN;
    }
    return NaN;
  };
  const v = expression();
  return i === tokens.length ? v : NaN;
}

type Input = CalculatorData["inputs"][number];

const CURRENCY = new Set(["$", "€", "£", "₹", "¥"]);

/** The value as it reads (₹40,00,000, 8.5%), and the raw number only while you're typing it. */
function NumberField({ input, value, onValue }: { input: Input; value: number; onValue: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const pre = CURRENCY.has(input.unit) ? input.unit : "";
  const post = pre ? "" : input.unit;
  return (
    <span className="flex h-8 items-center gap-1 rounded-[10px] bg-surface ps-2.5 pe-2.5 text-[13px] shadow-[inset_0_0_0_1px_var(--line)] transition-shadow duration-150 focus-within:shadow-[inset_0_0_0_1px_var(--line-strong)]">
      {pre && <span className="text-fg-4">{pre}</span>}
      <input
        aria-label={input.label}
        inputMode="decimal"
        value={draft ?? value.toLocaleString(pre === "₹" ? "en-IN" : "en", { maximumFractionDigits: 2 })}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.target.select()}
        onBlur={() => {
          const n = Number(draft?.replace(/[,\s]/g, ""));
          if (draft !== null && Number.isFinite(n)) onValue(n);
          setDraft(null);
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="w-[9ch] bg-transparent text-end text-fg tabular-nums outline-none"
      />
      {post && <span className="text-fg-4">{post}</span>}
    </span>
  );
}

export function Calculator({ data }: BlockProps<CalculatorData>) {
  const inputs = (data.inputs ?? []).filter((i): i is Input => !!i?.id && finite(i.value) && finite(i.min) && finite(i.max));
  const [values, setValues] = useState<Record<string, number>>({});
  const vars = Object.fromEntries(inputs.map((i) => [i.id, values[i.id] ?? i.value]));
  const outputs = (data.outputs ?? []).filter((o) => o?.label && o.formula);

  return (
    <div className="flex flex-col gap-4 px-2 py-1">
      <BlockHeader title={data.title} />
      <div className="flex flex-col gap-3.5">
        {inputs.map((input) => {
          const v = vars[input.id];
          const fill = ((v - input.min) / (input.max - input.min || 1)) * 100;
          return (
            <Arrive key={input.id} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor={`range-${input.id}`} className="text-[13px] text-fg-2">
                  {input.label}
                </label>
                <NumberField input={input} value={v} onValue={(n) => setValues((s) => ({ ...s, [input.id]: n }))} />
              </div>
              <input
                id={`range-${input.id}`}
                type="range"
                min={input.min}
                max={input.max}
                step={finite(input.step) && input.step > 0 ? input.step : (input.max - input.min) / 100}
                value={Math.min(input.max, Math.max(input.min, v))}
                onChange={(e) => setValues((s) => ({ ...s, [input.id]: Number(e.target.value) }))}
                className="range w-full"
                style={{ ["--fill" as string]: `${Math.max(0, Math.min(100, fill))}%` }}
              />
            </Arrive>
          );
        })}
      </div>
      {outputs.length > 0 && (
        <div className={`grid gap-2 ${outputs.length >= 3 ? "sm:grid-cols-3" : outputs.length === 2 ? "sm:grid-cols-2" : ""}`}>
          {outputs.map((o, i) => {
            const r = evaluate(o!.formula!, vars);
            const decimals = Math.max(0, Math.min(4, finite(o?.decimals) ? o!.decimals! : 2));
            const shown = Number.isFinite(r)
              ? format(Math.round(r * 10 ** decimals) / 10 ** decimals, o?.unit ?? "", true)
              : "Can't work this out";
            return (
              <Arrive key={i} className={`flex flex-col gap-0.5 rounded-[12px] px-3.5 py-3 ${i === 0 ? "bg-control shadow-[inset_0_0_0_1px_var(--line)]" : "bg-surface"}`}>
                <span className="text-[12px] text-fg-4">{o?.label}</span>
                <Swap value={shown} className={`leading-tight font-medium tracking-[-0.02em] text-fg ${i === 0 ? "text-[26px]" : "text-[20px]"}`} />
              </Arrive>
            );
          })}
        </div>
      )}
      {data.note && <p className="text-[12px] text-pretty text-fg-4">{data.note}</p>}
    </div>
  );
}

export const calculatorText = (d: BlockProps<CalculatorData>["data"]) => {
  const vars = Object.fromEntries((d.inputs ?? []).filter((i) => i?.id).map((i) => [i!.id!, i!.value ?? 0]));
  return [
    d.title,
    ...(d.inputs ?? []).map((i) => `${i?.label}: ${i?.value}${i?.unit ? ` ${i.unit}` : ""}`),
    ...(d.outputs ?? []).map((o) => `${o?.label}: ${format(evaluate(o?.formula ?? "", vars as Record<string, number>), o?.unit ?? "", true)}`),
  ]
    .filter(Boolean)
    .join("\n");
};

export function CalculatorSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-2 py-1">
      <Bar className="h-3.5 w-1/3" />
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="flex justify-between">
            <Bar className="h-3 w-1/4" />
            <Bar className="h-8 w-24" />
          </div>
          <Bar className="h-1 w-full" />
        </div>
      ))}
      <div className="skeleton h-20 rounded-[12px]" />
    </div>
  );
}

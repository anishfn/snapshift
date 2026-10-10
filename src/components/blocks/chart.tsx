"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState, type KeyboardEvent } from "react";
import type { ChartData, ChartKind, Streaming } from "@/lib/blocks";
import { easeOut, glide } from "@/lib/motion";
import { Action, Bar, BlockHeader, type BlockProps, finite, SERIES, Swap, useWidth } from "./shared";

// Seven forms, drawn by hand in SVG to the dataviz rules: line and area for change over time, bar, stacked and
// ranked for amounts, pie (a donut) and split for shares of a whole. One axis from zero, bars at most 24px with
// 4px rounded data-ends and 2px gaps, 2px lines with ringed dots, hairline grid, a legend only for two or more
// series (and it hides or shows them), sparse direct labels, a tooltip by hover or the arrow keys, and the same
// numbers one tap away as a table. Colour follows the series, never its rank.

const HEIGHT = 220;
const TOP = 20;
const BOTTOM = 28;
const BAR_MAX = 24;
const CURRENCY = new Set(["$", "€", "£", "₹", "¥"]);

/** A value in its unit. Compact (12.9K) for axes and labels; `full` for totals someone will act on. */
export function format(v: number, unit = "", full = false) {
  const abs = full ? 0 : Math.abs(v);
  const n =
    abs >= 1e9
      ? `${+(v / 1e9).toFixed(1)}B`
      : abs >= 1e6
        ? `${+(v / 1e6).toFixed(1)}M`
        : abs >= 1e4
          ? `${+(v / 1e3).toFixed(1)}K`
          : v.toLocaleString(unit === "₹" ? "en-IN" : "en", { maximumFractionDigits: 2 }); // rupees group the Indian way: 40,00,000
  if (!unit) return n;
  if (CURRENCY.has(unit)) return `${v < 0 ? "-" : ""}${unit}${n.replace("-", "")}`;
  return unit === "%" ? `${n}%` : `${n} ${unit}`;
}

/** Clean ticks from zero (or the lowest negative) to just past the top. */
function ticks(min: number, max: number) {
  const span = Math.max(max - min, Math.abs(max) || 1);
  const raw = span / 4;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step || step;
  const out: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) out.push(+t.toFixed(10));
  return out;
}

/** A bar with 4px rounded data-end and a square base, up or down from the baseline. */
function barPath(x: number, w: number, y0: number, y: number, round = true) {
  const h = Math.abs(y0 - y);
  const r = round ? Math.min(4, w / 2, h) : 0;
  if (y <= y0) return `M${x},${y0}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y0}Z`;
  return `M${x},${y0}V${y - r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y - r}V${y0}Z`;
}

type Series = { name: string; values: (number | undefined)[]; index: number };

/** The chart's numbers, tidied: complete labels, each series padded to them, at most `cap` series. */
function tidy(data: Streaming<ChartData>, cap: number) {
  const labels = (data.labels ?? []).filter((l): l is string => typeof l === "string");
  const series: Series[] = (data.series ?? []).slice(0, cap).map((s, index) => ({
    name: s?.name ?? "",
    values: labels.map((_, i) => (finite(s?.values?.[i]) ? (s!.values![i] as number) : undefined)),
    index,
  }));
  return { labels, series };
}

/* ---------- legend: identity for two or more series, and a switch for each ---------- */

function Legend({ series, hidden, onToggle }: { series: Series[]; hidden: Set<number>; onToggle: (i: number) => void }) {
  if (series.length < 2) return null;
  return (
    <ul className="flex flex-wrap gap-1">
      {series.map((s) => {
        const off = hidden.has(s.index);
        return (
          <li key={s.index}>
            <button
              type="button"
              onClick={() => onToggle(s.index)}
              aria-pressed={!off}
              className={`focus-ring flex h-6 items-center gap-1.5 rounded-[6px] px-1.5 text-[12px] transition-colors hover:bg-white/[0.06] ${off ? "text-fg-5" : "text-fg-3"}`}
            >
              <span
                aria-hidden
                className="h-[3px] w-3 rounded-full transition-opacity"
                style={{ background: SERIES[s.index], opacity: off ? 0.3 : 1 }}
              />
              <span className={off ? "line-through decoration-fg-6" : ""}>{s.name}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------- tooltip, by hover or keyboard ---------- */

function Tip({ x, width, title, rows, unit, total }: { x: number; width: number; title: string; rows: { name: string; value?: number; index: number }[]; unit: string; total?: number }) {
  // beside the crosshair, on whichever side has room, never over the axis; it glides from point to point
  const left = x < width / 2 ? x + 12 : Math.max(0, x - 12 - 160);
  return (
    <motion.div
      className="pointer-events-none absolute top-0 left-0 z-10 w-40 rounded-[12px] bg-raised px-3 py-2 shadow-popover"
      initial={{ opacity: 0, scale: 0.97, x: left }}
      animate={{ opacity: 1, scale: 1, x: left }}
      exit={{ opacity: 0, transition: { duration: 0.08 } }}
      transition={{ x: glide, opacity: { duration: 0.125, ease: easeOut }, scale: { duration: 0.125, ease: easeOut } }}
    >
      <p className="truncate text-[12px] text-fg-4">
        <Swap value={title} />
      </p>
      {rows.map((r) => (
        <p key={r.index} className="flex items-center justify-between gap-3 text-[12px]">
          <span className="flex min-w-0 items-center gap-1.5 text-fg-3">
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: SERIES[r.index] }} />
            <span className="truncate">{r.name || "Value"}</span>
          </span>
          <span className="text-fg tabular-nums">{finite(r.value) ? format(r.value, unit) : "-"}</span>
        </p>
      ))}
      {total !== undefined && (
        <p className="mt-1 flex justify-between border-t border-line pt-1 text-[12px]">
          <span className="text-fg-4">Total</span>
          <span className="text-fg tabular-nums">{format(total, unit)}</span>
        </p>
      )}
    </motion.div>
  );
}

/** Left and right step through the points; Escape lets go. The same tooltip as hover. */
function useKeys(count: number) {
  const [active, setActive] = useState<number | null>(null);
  const onKeyDown = (e: KeyboardEvent) => {
    if (!count) return;
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const step = e.key === "ArrowRight" ? 1 : -1;
      setActive((a) => (a === null ? (step > 0 ? 0 : count - 1) : Math.max(0, Math.min(count - 1, a + step))));
    }
    if (e.key === "Escape") setActive(null);
  };
  return { active, setActive, onKeyDown };
}

/* ---------- line, area, bar, stacked: one axis, categories along the bottom ---------- */

function Cartesian({ kind, data, hidden }: { kind: "line" | "area" | "bar" | "stacked"; data: Streaming<ChartData>; hidden: Set<number> }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const unit = data.unit ?? "";
  const cap = kind === "stacked" ? 5 : kind === "area" ? 1 : 3;
  const { labels, series: all } = tidy(data, cap);
  const series = all.filter((s) => !hidden.has(s.index));
  const { active, setActive, onKeyDown } = useKeys(labels.length);

  const totals = labels.map((_, i) => series.reduce((sum, s) => sum + Math.max(0, s.values[i] ?? 0), 0));
  const values = kind === "stacked" ? totals : series.flatMap((s) => s.values.filter(finite));
  const t = ticks(Math.min(0, ...values), Math.max(0, ...values));
  const lo = t[0];
  const hi = t[t.length - 1];
  const tickW = Math.max(...t.map((v) => format(v, unit).length)) * 6.4 + 10;
  const plotW = Math.max(0, width - tickW);
  const band = labels.length ? plotW / labels.length : 0;
  const y = (v: number) => TOP + (1 - (v - lo) / (hi - lo || 1)) * (HEIGHT - TOP - BOTTOM);
  const y0 = y(0);
  const cx = (i: number) => tickW + band * i + band / 2;

  const grouped = kind === "bar" ? Math.max(1, series.length) : 1;
  const barW = Math.max(2, Math.min(BAR_MAX, (band * 0.7 - (grouped - 1) * 2) / grouped));
  const groupW = barW * grouped + (grouped - 1) * 2;
  const longest = Math.max(1, ...labels.map((l) => l.length)) * 6.2 + 8;
  const every = Math.max(1, Math.ceil(longest / Math.max(band, 1)));

  // Sparing direct labels: the tallest bar of one series, or each line's last value.
  const single = series.length === 1 ? series[0].values : null;
  const top = single ? single.reduce<number>((m, v, i) => (finite(v) && (!finite(single[m]) || v > (single[m] as number)) ? i : m), 0) : -1;

  return (
    <div
      ref={ref}
      tabIndex={labels.length ? 0 : -1}
      onKeyDown={onKeyDown}
      onBlur={() => setActive(null)}
      onPointerLeave={() => setActive(null)}
      aria-label={`${data.title ?? "Chart"}. Use the left and right arrow keys to read each value.`}
      className="focus-ring relative rounded-[8px]"
    >
      {width > 0 && (
        <svg width={width} height={HEIGHT} className="block overflow-visible" aria-hidden>
          {t.map((v) => (
            <g key={v}>
              <line x1={tickW} x2={width} y1={y(v)} y2={y(v)} stroke={v === 0 ? "var(--line-strong)" : "var(--line)"} strokeWidth={1} />
              <text x={tickW - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-fg-5 text-[11px] tabular-nums">
                {format(v, unit)}
              </text>
            </g>
          ))}
          {labels.map((l, i) =>
            i % every === 0 ? (
              <text key={i} x={cx(i)} y={HEIGHT - 9} textAnchor="middle" className={`text-[11px] transition-[fill] duration-150 ${active === i ? "fill-fg" : "fill-fg-4"}`}>
                {l}
              </text>
            ) : null,
          )}
          <AnimatePresence>
            {active !== null && (kind === "line" || kind === "area") && (
              <motion.line
                y1={TOP - 8}
                y2={HEIGHT - BOTTOM}
                stroke="var(--line-strong)"
                strokeWidth={1}
                initial={{ opacity: 0, x1: cx(active), x2: cx(active) }}
                animate={{ opacity: 1, x1: cx(active), x2: cx(active) }}
                exit={{ opacity: 0 }}
                transition={{ x1: glide, x2: glide, opacity: { duration: 0.12 } }}
              />
            )}
          </AnimatePresence>

          {kind === "bar" &&
            series.map((s, k) =>
              s.values.map((v, i) =>
                finite(v) ? (
                  <motion.path
                    key={`${s.index}-${i}`}
                    fill={SERIES[s.index]}
                    initial={{ scaleY: 0, d: barPath(cx(i) - groupW / 2 + k * (barW + 2), barW, y0, y(v)) }}
                    animate={{ scaleY: 1, d: barPath(cx(i) - groupW / 2 + k * (barW + 2), barW, y0, y(v)), opacity: active === null || active === i ? 1 : 0.4 }}
                    transition={{ scaleY: { duration: 0.45, ease: easeOut, delay: i * 0.03 }, d: glide, opacity: { duration: 0.15 } }}
                    style={{ transformBox: "fill-box", transformOrigin: v >= 0 ? "bottom" : "top" }}
                  />
                ) : null,
              ),
            )}

          {kind === "stacked" &&
            labels.map((_, i) => {
              let base = 0;
              const parts = series.filter((s) => (s.values[i] ?? 0) > 0);
              return (
                <motion.g
                  key={i}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1, opacity: active === null || active === i ? 1 : 0.4 }}
                  transition={{ scaleY: { duration: 0.45, ease: easeOut, delay: i * 0.03 }, opacity: { duration: 0.15 } }}
                  style={{ transformBox: "fill-box", transformOrigin: "bottom" }}
                >
                  {parts.map((s, k) => {
                    const v = s.values[i] as number;
                    const from = y(base);
                    base += v;
                    // a 2px surface gap between segments: each one stops 2px short of the next
                    const to = y(base) + (k < parts.length - 1 ? 2 : 0);
                    const d = barPath(cx(i) - barW / 2, barW, from, Math.min(to, from), k === parts.length - 1);
                    return <motion.path key={s.index} initial={{ d }} animate={{ d }} transition={{ d: glide }} fill={SERIES[s.index]} />;
                  })}
                </motion.g>
              );
            })}

          {(kind === "line" || kind === "area") &&
            series.map((s) => {
              const pts = s.values.map((v, i) => (finite(v) ? [cx(i), y(v)] : null)).filter((p): p is number[] => !!p);
              if (!pts.length) return null;
              const last = pts[pts.length - 1];
              const line = `M${pts.map((p) => p.join(",")).join("L")}`;
              const area = `${line}L${last[0]},${y0}L${pts[0][0]},${y0}Z`;
              // the marker sits on the hovered point, or rests on the last one, and glides between them
              const at = active !== null && finite(s.values[active]) ? [cx(active), y(s.values[active] as number)] : last;
              return (
                <g key={s.index}>
                  {kind === "area" && (
                    <motion.path initial={{ d: area, opacity: 0 }} animate={{ d: area, opacity: 0.12 }} transition={{ d: glide, opacity: { duration: 0.4 } }} fill={SERIES[s.index]} />
                  )}
                  <motion.path
                    fill="none"
                    stroke={SERIES[s.index]}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    initial={{ pathLength: 0, d: line }}
                    animate={{ pathLength: 1, d: line }}
                    transition={{ pathLength: { duration: 0.6, ease: easeOut }, d: glide }}
                  />
                  <motion.circle
                    r={4}
                    fill={SERIES[s.index]}
                    stroke="var(--raised)"
                    strokeWidth={2}
                    initial={{ cx: at[0], cy: at[1] }}
                    animate={{ cx: at[0], cy: at[1] }}
                    transition={glide}
                  />
                </g>
              );
            })}

          {/* direct labels step back while a tooltip is reading the values out */}
          <motion.g initial={false} animate={{ opacity: active === null ? 1 : 0 }} transition={{ duration: 0.15 }}>
          {(kind === "bar" || kind === "stacked"
              ? (() => {
                  const vals = kind === "stacked" ? totals : single;
                  if (!vals) return null;
                  const i = kind === "stacked" ? totals.indexOf(Math.max(...totals)) : top;
                  const v = vals[i];
                  return finite(v) ? (
                    <text x={cx(i)} y={y(v) - 7} textAnchor="middle" className="fill-fg-2 text-[11px] tabular-nums">
                      {format(v, unit)}
                    </text>
                  ) : null;
                })()
              : series.length <= 2 &&
                series.map((s) => {
                  const i = s.values.findLastIndex(finite);
                  return i < 0 ? null : (
                    <text key={s.index} x={cx(i)} y={y(s.values[i] as number) - 11} textAnchor="end" className="fill-fg-2 text-[11px] tabular-nums">
                      {format(s.values[i] as number, unit)}
                    </text>
                  );
                }))}
          </motion.g>

          {/* hit targets: the whole band, wider than any mark */}
          {labels.map((_, i) => (
            <rect key={i} x={tickW + band * i} y={0} width={band} height={HEIGHT} fill="transparent" onPointerEnter={() => setActive(i)} />
          ))}
        </svg>
      )}
      <AnimatePresence>
        {active !== null && width > 0 && (
          <Tip
            x={cx(active)}
            width={width}
            title={labels[active]}
            unit={unit}
            rows={series.map((s) => ({ name: s.name, value: s.values[active], index: s.index }))}
            total={kind === "stacked" ? totals[active] : undefined}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------- ranked: horizontal bars, largest first, long names fit ---------- */

function Ranked({ data }: { data: Streaming<ChartData> }) {
  const unit = data.unit ?? "";
  const { labels, series } = tidy(data, 1);
  const rows = labels
    .map((label, i) => ({ label, value: series[0]?.values[i] }))
    .filter((r): r is { label: string; value: number } => finite(r.value))
    .sort((a, b) => b.value - a.value);
  const max = Math.max(0, ...rows.map((r) => r.value)) || 1;
  return (
    <ol className="flex flex-col gap-1">
      {rows.map((r, i) => (
        <li key={r.label} className="grid grid-cols-[minmax(0,38%)_1fr] items-center gap-3 rounded-[8px] px-1 py-1 transition-colors hover:bg-white/[0.04]">
          <span className="flex min-w-0 items-baseline gap-2 text-[13px]">
            <span className="w-4 shrink-0 text-end text-[11px] text-fg-5 tabular-nums">{i + 1}</span>
            <span className="truncate text-fg-2" title={r.label}>
              {r.label}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <motion.span
              className="h-3.5 rounded-e-[4px]"
              style={{ background: SERIES[0], width: `${Math.max(0.5, (r.value / max) * 82)}%`, transformOrigin: "left" }}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.45, ease: easeOut, delay: i * 0.03 }}
            />
            <span className="shrink-0 text-[12px] text-fg-2 tabular-nums">{format(r.value, unit)}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ---------- pie: a donut of up to six shares, the total in the middle ---------- */

function parts(data: Streaming<ChartData>, cap: number) {
  const values = data.series?.[0]?.values ?? [];
  let list = (data.labels ?? [])
    .map((label, i) => ({ label: label ?? "", value: values[i] }))
    .filter((p): p is { label: string; value: number } => finite(p.value) && p.value > 0);
  if (list.length > cap) {
    const rest = list.slice(cap - 1).reduce((s, p) => s + p.value, 0);
    list = [...list.slice(0, cap - 1), { label: "Other", value: rest }];
  }
  return list;
}

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.sin(a), cy - r * Math.cos(a)];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M${x0},${y0}A${r},${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1},${y1}`;
}

function Pie({ data }: { data: Streaming<ChartData> }) {
  const unit = data.unit ?? "";
  const list = parts(data, 6);
  const total = list.reduce((s, p) => s + p.value, 0) || 1;
  const [active, setActive] = useState<number | null>(null);
  const SIZE = 168;
  const R = 68;
  const W = 24;
  const GAP = list.length > 1 ? 0.035 : 0; // the 2px surface gap, as an angle
  // each slice's start and end, worked out before drawing
  const angles = list.reduce<[number, number][]>((acc, p) => {
    const start = acc.length ? acc[acc.length - 1][1] : 0;
    return [...acc, [start, start + (p.value / total) * Math.PI * 2]];
  }, []);
  // When the values are already percentages, the middle opens on the largest share rather than "100% total".
  const isShare = unit === "%";
  const shown = active !== null ? list[active] : isShare ? list.reduce((a, b) => (b.value > a.value ? b : a), list[0]) : null;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} aria-hidden>
          {list.map((p, i) => {
            const [start, stop] = angles[i];
            const end = Math.max(start, stop - GAP);
            return (
              <motion.path
                key={p.label}
                d={arc(SIZE / 2, SIZE / 2, R, start, list.length === 1 ? start + Math.PI * 1.9999 : end)}
                fill="none"
                stroke={SERIES[i]}
                strokeWidth={W}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1, opacity: active === null || active === i ? 1 : 0.35 }}
                transition={{ pathLength: { duration: 0.6, ease: easeOut, delay: i * 0.05 }, opacity: { duration: 0.15 } }}
              />
            );
          })}
        </svg>
        {/* the middle says the total, or the share being pointed at */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={shown?.label ?? "total"}
              className="flex max-w-[96px] flex-col items-center"
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 0.15 } }}
              exit={{ opacity: 0, filter: "blur(4px)", transition: { duration: 0.08 } }}
            >
              <span className="text-[18px] leading-tight font-medium text-fg">
                {shown ? (isShare ? format(shown.value, unit) : `${Math.round((shown.value / total) * 100)}%`) : format(total, unit)}
              </span>
              <span className="truncate text-[11px] text-fg-4">{shown ? shown.label : "Total"}</span>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      <ul className="flex w-full min-w-0 flex-col gap-0.5">
        {list.map((p, i) => (
          <li
            key={p.label}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
            className={`flex items-center justify-between gap-3 rounded-[8px] px-2 py-1.5 text-[13px] transition-colors ${active === i ? "bg-white/[0.05]" : ""}`}
          >
            <span className="flex min-w-0 items-center gap-2 text-fg-2">
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: SERIES[i] }} />
              <span className="truncate">{p.label}</span>
            </span>
            <span className="shrink-0 text-fg-4 tabular-nums">
              <span className="text-fg">{format(p.value, unit)}</span>
              {unit !== "%" && ` · ${Math.round((p.value / total) * 100)}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- split: one whole as a single bar, the parts named under it ---------- */

function Split({ data }: { data: Streaming<ChartData> }) {
  const unit = data.unit ?? "";
  const list = parts(data, 5);
  const total = list.reduce((s, p) => s + p.value, 0) || 1;
  const [active, setActive] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-6 gap-[2px]" aria-hidden>
        {list.map((p, i) => (
          <motion.div
            key={p.label}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
            className="h-full first:rounded-s-[4px] last:rounded-e-[4px]"
            style={{ width: `${(p.value / total) * 100}%`, background: SERIES[i], transformOrigin: "left" }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1, opacity: active === null || active === i ? 1 : 0.4 }}
            transition={{ scaleX: { duration: 0.45, ease: easeOut, delay: i * 0.05 }, opacity: { duration: 0.15 } }}
          />
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2">
        {list.map((p, i) => (
          <li
            key={p.label}
            onPointerEnter={() => setActive(i)}
            onPointerLeave={() => setActive(null)}
            className={`flex items-center justify-between gap-3 rounded-[8px] px-1.5 py-1 text-[13px] transition-colors ${active === i ? "bg-white/[0.05]" : ""}`}
          >
            <span className="flex min-w-0 items-center gap-2 text-fg-2">
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: SERIES[i] }} />
              <span className="truncate">{p.label}</span>
            </span>
            <span className="shrink-0 text-fg-4 tabular-nums">
              <span className="text-fg">{format(p.value, unit)}</span>
              {unit !== "%" && ` · ${Math.round((p.value / total) * 100)}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------- the table twin: every number, readable without the picture ---------- */

function DataTable({ data }: { data: Streaming<ChartData> }) {
  const unit = data.unit ?? "";
  const { labels, series } = tidy(data, 5);
  return (
    <div className="-mx-1 overflow-x-auto px-1">
      <table className="w-full border-collapse text-[13px]">
        <caption className="sr-only">{data.title}</caption>
        <thead>
          <tr>
            <th scope="col" className="pb-2 text-start text-[12px] font-normal text-fg-4" />
            {series.map((s) => (
              <th key={s.index} scope="col" className="px-2 pb-2 text-end text-[12px] font-normal whitespace-nowrap text-fg-4">
                {s.name || "Value"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {labels.map((l, i) => (
            <tr key={i} className="border-t border-line">
              <th scope="row" className="py-1.5 pe-2 text-start font-normal text-fg-2">
                {l}
              </th>
              {series.map((s) => (
                <td key={s.index} className="px-2 py-1.5 text-end text-fg tabular-nums">
                  {finite(s.values[i]) ? format(s.values[i] as number, unit) : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Tab-separated, so it pastes straight into a spreadsheet. */
export function chartText(data: Streaming<ChartData>) {
  const { labels, series } = tidy(data, 5);
  const head = ["", ...series.map((s) => s.name || "Value")].join("\t");
  return [data.title ?? "", head, ...labels.map((l, i) => [l, ...series.map((s) => s.values[i] ?? "")].join("\t"))].join("\n");
}

const KINDS: ChartKind[] = ["line", "area", "bar", "stacked", "ranked", "pie", "split"];

export function Chart({ data }: BlockProps<ChartData>) {
  const kind: ChartKind = KINDS.includes(data.kind as ChartKind) ? (data.kind as ChartKind) : "bar";
  const [table, setTable] = useState(false);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(i)) next.delete(i);
      // never hide the last visible series
      else if (next.size < (data.series?.length ?? 1) - 1) next.add(i);
      return next;
    });
  const cartesian = kind === "line" || kind === "area" || kind === "bar" || kind === "stacked";
  const { series } = tidy(data, kind === "stacked" ? 5 : kind === "area" ? 1 : 3);

  return (
    <div className="flex flex-col gap-3 px-2 py-1">
      <BlockHeader title={data.title}>
        <Action label={table ? "Chart" : "Table"} pressed={table} onClick={() => setTable((t) => !t)} icon={null} />
      </BlockHeader>
      {cartesian && !table && <Legend series={series} hidden={hidden} onToggle={toggle} />}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={table ? "table" : "chart"}
          initial={{ opacity: 0, filter: "blur(4px)" }}
          animate={{ opacity: 1, filter: "blur(0px)", transition: { duration: 0.2, ease: easeOut } }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
        >
          {table ? (
            <DataTable data={data} />
          ) : cartesian ? (
            <Cartesian kind={kind} data={data} hidden={hidden} />
          ) : kind === "ranked" ? (
            <Ranked data={data} />
          ) : kind === "pie" ? (
            <Pie data={data} />
          ) : (
            <Split data={data} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-2 py-1">
      <Bar className="h-3.5 w-1/3" />
      <div className="flex items-end gap-4 ps-10 pb-[28px]" style={{ height: HEIGHT }}>
        {[0.55, 0.8, 0.4, 0.95, 0.65, 0.75].map((h, i) => (
          <div key={i} className="flex flex-1 justify-center">
            <div className="skeleton w-6 rounded-t-[4px]" style={{ height: `${h * 150}px` }} />
          </div>
        ))}
      </div>
    </div>
  );
}

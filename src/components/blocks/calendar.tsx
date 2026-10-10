"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon } from "@/components/icons";
import type { CalendarData } from "@/lib/blocks";
import { easeOut } from "@/lib/motion";
import { Action, Arrive, Bar, BlockHeader, type BlockProps, saveFile, useToday } from "./shared";

// A month with its dates marked, Monday first, today ringed, and the month's events beside it. Tap a date to
// pick out its events; more than one month pages with the arrows (the grid slides the way you went). "Add to
// calendar" saves every event as an .ics file any calendar app opens.

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

type Event = { date: string; title: string; note: string };

const valid = (d?: string) => !!d && /^\d{4}-\d{2}-\d{2}$/.test(d);
const day = (d: string) => Number(d.slice(8, 10));

/** All-day events in iCalendar form. */
function ics(events: Event[]) {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const next = (d: string) => {
    const t = new Date(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, day(d) + 1);
    return `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, "0")}${String(t.getDate()).padStart(2, "0")}`;
  };
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//chat//Snap//EN",
    ...events.flatMap((e, i) => [
      "BEGIN:VEVENT",
      `UID:${e.date}-${i}@chat`,
      `DTSTAMP:${e.date.replace(/-/g, "")}T000000Z`,
      `DTSTART;VALUE=DATE:${e.date.replace(/-/g, "")}`,
      `DTEND;VALUE=DATE:${next(e.date)}`,
      `SUMMARY:${esc(e.title)}`,
      ...(e.note ? [`DESCRIPTION:${esc(e.note)}`] : []),
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ].join("\r\n");
}

export function Calendar({ data }: BlockProps<CalendarData>) {
  const events = (data.events ?? []).filter((e): e is Event => valid(e?.date) && !!e?.title).sort((a, b) => a.date.localeCompare(b.date));
  const today = useToday();
  const months = [...new Set(events.map((e) => e.date.slice(0, 7)))];
  // Open on the month with what's next, else the first.
  const upcoming = months.findIndex((m) => events.some((e) => e.date.startsWith(m) && e.date >= today));
  const [index, setIndex] = useState<number | null>(null);
  const [dir, setDir] = useState(1);
  const [selected, setSelected] = useState<number | null>(null);
  const current = index ?? Math.max(0, today ? upcoming : 0);
  const key = months[Math.min(current, months.length - 1)];
  if (!key) return null;

  const [y, m] = key.split("-").map(Number);
  const first = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const days = new Date(y, m, 0).getDate();
  const inMonth = events.filter((e) => e.date.startsWith(key));
  const marked = new Set(inMonth.map((e) => day(e.date)));
  const go = (step: number) => {
    setDir(step);
    setSelected(null);
    setIndex(Math.max(0, Math.min(months.length - 1, current + step)));
  };

  return (
    <div className="flex flex-col gap-3 px-2 py-1">
      <BlockHeader title={`${MONTHS[m - 1]} ${y}`} meta={months.length > 1 ? `${current + 1} of ${months.length} months` : undefined}>
        {months.length > 1 && (
          <>
            <Action showLabel={false} label="Previous month" icon={<ChevronLeftIcon size={15} />} onClick={() => go(-1)} />
            <Action showLabel={false} label="Next month" icon={<ChevronRightIcon size={15} />} onClick={() => go(1)} />
          </>
        )}
        <Action label="Add to calendar" icon={<DownloadIcon size={14} />} onClick={() => saveFile("events.ics", "text/calendar", ics(events))} />
      </BlockHeader>
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="flex shrink-0 flex-col gap-1.5 sm:w-[252px]">
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-fg-5">
            {WEEKDAYS.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.div
                key={key}
                className="grid grid-cols-7 gap-1"
                initial={{ opacity: 0, x: dir * 16 }}
                animate={{ opacity: 1, x: 0, transition: { duration: 0.25, ease: easeOut } }}
                exit={{ opacity: 0, x: dir * -16, transition: { duration: 0.12, ease: easeOut } }}
              >
                {Array.from({ length: first }, (_, i) => (
                  <span key={`b${i}`} />
                ))}
                {Array.from({ length: days }, (_, i) => {
                  const d = i + 1;
                  const iso = `${key}-${String(d).padStart(2, "0")}`;
                  const has = marked.has(d);
                  const isToday = iso === today;
                  const cls = `relative flex aspect-square flex-col items-center justify-center rounded-[8px] text-[12px] tabular-nums transition-colors duration-200 ${
                    has
                      ? selected === d
                        ? "bg-accent font-medium text-accent-fg"
                        : "bg-white/[0.07] font-medium text-fg hover:bg-white/[0.11]"
                      : iso < today
                        ? "text-fg-6"
                        : "text-fg-3"
                  } ${isToday ? "shadow-[inset_0_0_0_1px_var(--line-strong)]" : ""}`;
                  return has ? (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={selected === d}
                      aria-label={`${MONTHS[m - 1]} ${d}: ${inMonth.filter((e) => day(e.date) === d).map((e) => e.title).join(", ")}`}
                      onClick={() => setSelected((s) => (s === d ? null : d))}
                      className={`focus-ring ${cls}`}
                    >
                      {d}
                      {/* a dot under any date with something on it */}
                      <span aria-hidden className={`absolute bottom-[5px] size-1 rounded-full transition-colors duration-200 ${selected === d ? "bg-accent-fg" : "bg-fg-3"}`} />
                    </button>
                  ) : (
                    <span key={d} className={cls} aria-current={isToday ? "date" : undefined}>
                      {d}
                    </span>
                  );
                })}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
        <ul className="flex min-w-0 flex-1 flex-col gap-0.5 sm:pt-6">
          {inMonth.map((e, i) => {
            const dim = selected !== null && selected !== day(e.date);
            const past = !!today && e.date < today;
            const left = today && !past ? Math.round((new Date(e.date).getTime() - new Date(today).getTime()) / 86_400_000) : null;
            return (
              <Arrive as="li" key={`${key}-${i}`} className={`flex gap-3 rounded-[8px] px-1.5 py-1 transition-opacity ${dim ? "opacity-35" : ""}`}>
                <span className={`w-12 shrink-0 text-[12px] leading-5 tabular-nums ${past ? "text-fg-5" : "text-fg-4"}`}>
                  {MONTHS[m - 1].slice(0, 3)} {day(e.date)}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={`text-[14px] leading-5 ${past ? "text-fg-4 line-through decoration-fg-6" : "text-fg"}`}>{e.title}</span>
                  {e.note && <span className="text-[12px] text-fg-4">{e.note}</span>}
                </span>
                {left !== null && <span className="shrink-0 text-[12px] leading-5 text-fg-5 tabular-nums">{left === 0 ? "today" : left === 1 ? "tomorrow" : `in ${left} days`}</span>}
              </Arrive>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export const calendarText = (d: BlockProps<CalendarData>["data"]) => (d.events ?? []).map((e) => `${e?.date}  ${e?.title}${e?.note ? ` (${e.note})` : ""}`).join("\n");

export function CalendarSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-2 py-1">
      <Bar className="h-3.5 w-28" />
      <div className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <div className="grid grid-cols-7 gap-1 sm:w-[252px]">
          {Array.from({ length: 35 }, (_, i) => (
            <div key={i} className="skeleton aspect-square rounded-[8px]" />
          ))}
        </div>
        <div className="flex flex-1 flex-col gap-3 sm:pt-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Bar className="h-3 w-10" />
              <Bar className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

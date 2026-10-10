"use client";

import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import { ArrowUpRightIcon, MinusIcon, PlusIcon, RotateIcon } from "@/components/icons";
import type { MapData } from "@/lib/blocks";
import { easeOut } from "@/lib/motion";
import { Action, Arrive, Bar, type BlockProps, finite, useWidth } from "./shared";

// Places on a dark map: Esri's Dark Gray Canvas basemap (keyless, no labels of its own, so ours read clearly) as
// plain 256px Web Mercator tiles, no map library. The view fits every place with room round it; drag to pan,
// +/- to zoom, reset to fit again. The list under it is linked: pointing at a place lights its pin, tapping it
// centres the map there, and each opens in a maps app. Numbered stops are joined when they're a route.

const TILE = 256;
const HEIGHT = 300;
const PAD = 48;
const MAX_ZOOM = 16; // the basemap's deepest level

type Place = { name: string; lat: number; lng: number; note: string };

function project(lat: number, lng: number, z: number) {
  const world = TILE * 2 ** z;
  const s = Math.sin((Math.max(-85, Math.min(85, lat)) * Math.PI) / 180);
  return { x: ((lng + 180) / 360) * world, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * world };
}

/** The closest zoom that still shows every place inside the padding. One place gets a street-level view. */
function fit(places: Place[], width: number) {
  if (places.length < 2) return 14;
  for (let z = MAX_ZOOM; z > 1; z--) {
    const pts = places.map((p) => project(p.lat, p.lng, z));
    const w = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
    const h = Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y));
    if (w <= width - PAD * 2 && h <= HEIGHT - PAD * 2) return z;
  }
  return 1;
}

export function MapBlock({ data }: BlockProps<MapData>) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [zoomBy, setZoomBy] = useState(0);
  // The view's centre in longitude/latitude when the reader has moved it; null means "fit everything".
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [active, setActive] = useState<number | null>(null);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const flight = useRef<number | null>(null);
  // Which way the last zoom went, so the outgoing layer grows (in) or shrinks (out) as the new one settles.
  const [zoomDir, setZoomDir] = useState(0);
  const places = (data.places ?? []).filter((p): p is Place => !!p?.name && finite(p.lat) && finite(p.lng));
  if (!places.length) return null;

  const z = Math.max(1, Math.min(MAX_ZOOM, fit(places, width || 600) + zoomBy));
  const pts = places.map((p) => project(p.lat, p.lng, z));
  const c = center
    ? project(center.lat, center.lng, z)
    : {
        x: (Math.min(...pts.map((p) => p.x)) + Math.max(...pts.map((p) => p.x))) / 2,
        y: (Math.min(...pts.map((p) => p.y)) + Math.max(...pts.map((p) => p.y))) / 2,
      };
  const ox = c.x - width / 2;
  const oy = c.y - HEIGHT / 2;
  const n = 2 ** z;
  const moved = center !== null || zoomBy !== 0;

  /** World pixels back to degrees, to keep the centre steady across zoom levels. */
  const unproject = (x: number, y: number) => {
    const world = TILE * n;
    const lng = (x / world) * 360 - 180;
    const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / world))) * 180) / Math.PI;
    return { lat, lng };
  };

  const tiles: { key: string; src: string; left: number; top: number }[] = [];
  if (width) {
    for (let tx = Math.floor(ox / TILE); tx <= Math.floor((ox + width) / TILE); tx++) {
      for (let ty = Math.floor(oy / TILE); ty <= Math.floor((oy + HEIGHT) / TILE); ty++) {
        if (ty < 0 || ty >= n) continue;
        const wx = ((tx % n) + n) % n;
        tiles.push({
          key: `${z}/${tx}/${ty}`,
          src: `https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/${z}/${ty}/${wx}`,
          left: tx * TILE - ox,
          top: ty * TILE - oy,
        });
      }
    }
  }

  const route = !!data.route && places.length > 1;
  const labelled = places.length <= 6;
  /** Flies the view to a point over 0.4s (ease-out), instead of jumping; a drag cuts it short. */
  const fly = (to: { lat: number; lng: number }, then?: () => void) => {
    if (flight.current) cancelAnimationFrame(flight.current);
    const from = unproject(c.x, c.y);
    // the clock starts on the first frame, from the frame's own timestamp
    let start: number | null = null;
    const step = (now: number) => {
      start ??= now;
      const t = Math.min(1, Math.max(0, (now - start) / 400));
      const k = 1 - (1 - t) ** 3;
      setCenter({ lat: from.lat + (to.lat - from.lat) * k, lng: from.lng + (to.lng - from.lng) * k });
      if (t < 1) flight.current = requestAnimationFrame(step);
      else {
        flight.current = null;
        then?.();
      }
    };
    flight.current = requestAnimationFrame(step);
  };
  const zoom = (step: number) => {
    setZoomDir(step);
    setZoomBy((v) => Math.min(v + step, MAX_ZOOM));
  };
  const focus = (i: number) => {
    setActive(i);
    fly({ lat: places[i].lat, lng: places[i].lng });
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        ref={ref}
        // a mouse drags freely; on touch, vertical swipes still scroll the page and sideways ones pan
        className="relative cursor-grab touch-pan-y overflow-hidden [@media(pointer:fine)]:touch-none rounded-[12px] bg-surface select-none active:cursor-grabbing"
        style={{ height: HEIGHT }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("button,a")) return;
          if (flight.current) cancelAnimationFrame(flight.current);
          flight.current = null;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, cx: c.x, cy: c.y };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          setCenter(unproject(d.cx - (e.clientX - d.x), d.cy - (e.clientY - d.y)));
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
      >
        {/* the map itself: on a zoom step the old layer scales away as the new one scales into place */}
        <AnimatePresence initial={false} custom={zoomDir}>
          <motion.div
            key={z}
            custom={zoomDir}
            className="pointer-events-none absolute inset-0 *:pointer-events-auto"
            variants={{
              enter: (dir: number) => ({ scale: dir > 0 ? 0.5 : dir < 0 ? 2 : 1, opacity: dir ? 0.6 : 1 }),
              still: { scale: 1, opacity: 1 },
              leave: (dir: number) => ({ scale: dir > 0 ? 2 : dir < 0 ? 0.5 : 1, opacity: 0 }),
            }}
            initial="enter"
            animate="still"
            exit="leave"
            transition={{ duration: 0.32, ease: easeOut }}
          >
        {tiles.map((t) => (
          // eslint-disable-next-line @next/next/no-img-element -- map tiles: many tiny remote images, placed by hand
          <img
            key={t.key}
            src={t.src}
            alt=""
            width={TILE}
            height={TILE}
            draggable={false}
            onLoad={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            // a step darker, to sit in the app's palette
            className="absolute max-w-none opacity-0 brightness-[0.72] transition-opacity duration-300 select-none"
            style={{ left: t.left, top: t.top }}
          />
        ))}
        {route && (
          <svg className="pointer-events-none absolute inset-0" width={width} height={HEIGHT} aria-hidden>
            <polyline
              points={pts.map((p) => `${p.x - ox},${p.y - oy}`).join(" ")}
              fill="none"
              stroke="var(--fg)"
              strokeOpacity={0.6}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        )}
        {places.map((p, i) => {
          const on = active === i;
          return (
            <div key={i} className={`absolute ${on ? "z-20" : "z-10"}`} style={{ left: pts[i].x - ox, top: pts[i].y - oy }}>
              <span
                className={`absolute flex -translate-1/2 items-center justify-center rounded-full font-medium tabular-nums ring-2 ring-background transition-[scale,background-color] duration-200 ease-out ${
                  route ? "size-5 text-[11px]" : "size-3"
                } ${on ? "scale-125 bg-accent text-accent-fg" : active === null ? "bg-accent text-accent-fg" : "bg-fg-3 text-background"}`}
              >
                {route ? i + 1 : null}
              </span>
              {(labelled || on) && (
                <span
                  className={`pointer-events-none absolute top-0 left-3.5 -translate-y-1/2 rounded-[6px] px-1.5 py-0.5 text-[12px] whitespace-nowrap shadow-faint transition-colors ${
                    on ? "bg-accent text-accent-fg" : "bg-raised text-fg"
                  }`}
                >
                  {p.name}
                </span>
              )}
            </div>
          );
        })}
          </motion.div>
        </AnimatePresence>
        <div className="absolute top-2 right-2 z-30 flex flex-col gap-0.5 rounded-[10px] bg-raised p-0.5 shadow-faint">
          <Action showLabel={false} label="Zoom in" icon={<PlusIcon size={15} />} onClick={() => zoom(1)} />
          <Action showLabel={false} label="Zoom out" icon={<MinusIcon size={15} />} onClick={() => zoom(-1)} />
          {moved && (
            <Action
              showLabel={false}
              label="Fit all places"
              icon={<RotateIcon size={14} />}
              onClick={() => {
                setActive(null);
                if (zoomBy !== 0) {
                  setZoomDir(-Math.sign(zoomBy));
                  setZoomBy(0);
                  setCenter(null);
                } else {
                  const all = places.map((p) => project(p.lat, p.lng, z));
                  const mid = unproject(
                    (Math.min(...all.map((p) => p.x)) + Math.max(...all.map((p) => p.x))) / 2,
                    (Math.min(...all.map((p) => p.y)) + Math.max(...all.map((p) => p.y))) / 2,
                  );
                  fly(mid, () => setCenter(null));
                }
              }}
            />
          )}
        </div>
        <p className="absolute right-1.5 bottom-1 z-30 text-[10px] text-fg-5">
          <a href="https://www.esri.com" target="_blank" rel="noreferrer" className="hover:text-fg-3">
            Powered by Esri
          </a>{" "}
          · ©{" "}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="hover:text-fg-3">
            OpenStreetMap
          </a>{" "}
          contributors
        </p>
      </div>
      <ol className="flex flex-col">
        {places.map((p, i) => (
          <Arrive
            as="li"
            key={i}
            className={`group flex items-center gap-1 rounded-[10px] transition-colors ${active === i ? "bg-white/[0.05]" : "hover:bg-white/[0.03]"}`}
          >
            <button
              type="button"
              onClick={() => focus(i)}
              onPointerEnter={() => setActive(i)}
              onPointerLeave={() => setActive((a) => (a === i && !center ? null : a))}
              className="focus-ring flex min-w-0 flex-1 items-baseline gap-2.5 rounded-[10px] px-2 py-1.5 text-start text-[13px]"
            >
              <span className="w-4 shrink-0 text-end text-[12px] text-fg-5 tabular-nums">{i + 1}</span>
              <span className="shrink-0 text-fg">{p.name}</span>
              {p.note && <span className="truncate text-fg-4">{p.note}</span>}
            </button>
            <Action
              showLabel={false}
              label={`Open ${p.name} in Maps`}
              icon={<ArrowUpRightIcon size={14} />}
              href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}
            />
          </Arrive>
        ))}
      </ol>
    </div>
  );
}

export const mapText = (d: BlockProps<MapData>["data"]) =>
  (d.places ?? []).map((p, i) => `${i + 1}. ${p?.name}${p?.note ? `, ${p.note}` : ""} (${p?.lat}, ${p?.lng})`).join("\n");

export function MapSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="skeleton rounded-[12px]" style={{ height: HEIGHT }} />
      <div className="flex flex-col gap-2 px-2">
        <Bar className="h-3 w-1/3" />
        <Bar className="h-3 w-1/4" />
      </div>
    </div>
  );
}

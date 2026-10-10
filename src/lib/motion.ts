// Shared motion language. Values come from Emil Kowalski's and Jakub Krehel's
// guidance; use these instead of inventing new curves or scales.

/** Strong ease-out for anything entering, exiting or responding to input. */
export const easeOut = [0.23, 1, 0.32, 1] as const;

/** Strong ease-in-out for elements moving on screen. */
export const easeInOut = [0.77, 0, 0.175, 1] as const;

/** Press feedback for every pressable element. Never below 0.95. */
export const press = { scale: 0.96 } as const;

/** Contextual icon swap: scale 0.25 → 1, blur 4px → 0, spring with no bounce. */
export const iconSwap = {
  initial: { opacity: 0, scale: 0.25, filter: "blur(4px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.25, filter: "blur(4px)" },
  transition: { type: "spring", duration: 0.3, bounce: 0 },
} as const;

/**
 * A piece's own controls arriving (toolbars, captions, hints): up from 12px lower, out of a 6px blur, slowly.
 * Pass a delay to stagger the parts that arrive together.
 */
export const riseIn = (delay = 0) =>
  ({
    initial: { opacity: 0, y: 12, filter: "blur(6px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { duration: 0.55, ease: easeOut, delay },
  }) as const;

/** `riseIn` as variants (hidden → shown), for an arrival that waits on a condition. The whole thing moves as one. */
export const rise = {
  hidden: { opacity: 0, y: 12, filter: "blur(6px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.55, ease: easeOut } },
} as const;

/**
 * The same arrival for a bar whose items should come up one after another: put `riseGroup` on the bar
 * (initial="hidden", animate="shown") and `riseItem` on each item.
 */
export const riseGroup = {
  hidden: { opacity: 0, y: 12, filter: "blur(6px)" },
  shown: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: easeOut, staggerChildren: 0.04, delayChildren: 0.06 },
  },
} as const;

export const riseItem = {
  hidden: { opacity: 0, y: 10, filter: "blur(4px)" },
  shown: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: easeOut } },
} as const;

/**
 * Something already on screen moving to a new place: a tooltip following the pointer, a crosshair, rows settling
 * into a new order, a map recentring. A spring with no bounce, so it can be redirected mid-way without a jolt.
 */
export const glide = { type: "spring", duration: 0.3, bounce: 0 } as const;

/** Full-width rows don't scale on press (it reads as a bounce); they darken a touch while held instead. */
export const rowPress = "active:bg-white/[0.07] transition-colors duration-150";

/** A small control's press: slighter than `press`, for checks and dots. */
export const tap = { scale: 0.9 } as const;

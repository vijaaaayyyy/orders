export type StationTone = {
  /** Gradient classes for a pin / ticket header. */
  grad: string;
  /** Soft chip with readable text in both themes. */
  chip: string;
  /** Solid colour for small bars / dots. */
  bar: string;
  /** Accent text colour. */
  text: string;
};

export const STATION_TONE: Record<string, StationTone> = {
  "Hot line": {
    grad: "from-stone-600 to-stone-500",
    chip: "bg-stone-500/15 text-stone-700 dark:text-stone-300",
    bar: "bg-stone-500",
    text: "text-stone-600 dark:text-stone-400",
  },
  Grill: {
    grad: "from-rose-500 to-pink-500",
    chip: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
    bar: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
  },
  Snack: {
    grad: "from-teal-500 to-emerald-500",
    chip: "bg-teal-500/15 text-teal-700 dark:text-teal-300",
    bar: "bg-teal-500",
    text: "text-teal-600 dark:text-teal-400",
  },
  Tawa: {
    grad: "from-amber-500 to-yellow-400",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
    bar: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
  },
  Rice: {
    grad: "from-indigo-500 to-blue-500",
    chip: "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
    bar: "bg-indigo-500",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  Wok: {
    grad: "from-violet-500 to-purple-500",
    chip: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    bar: "bg-violet-500",
    text: "text-violet-600 dark:text-violet-400",
  },
  Beverages: {
    grad: "from-sky-500 to-cyan-400",
    chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
    bar: "bg-sky-500",
    text: "text-sky-600 dark:text-sky-400",
  },
};

export const DEFAULT_TONE: StationTone = {
  grad: "from-ready to-ready-2",
  chip: "bg-ready-soft text-ready",
  bar: "bg-ready",
  text: "text-ready",
};

export function stationTone(station: string | undefined): StationTone {
  return (station && STATION_TONE[station]) || DEFAULT_TONE;
}

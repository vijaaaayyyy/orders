import { Cog, CircuitBoard, DraftingCompass, Ruler, Atom, Wrench, Magnet, Orbit, Atom as At, Binary, BatteryCharging, Gauge, Cable, Fan, Disc3, Bolt, Shell, Plug, Settings, Hammer } from "lucide-react";

const EQUATION_TEXTS = [
  "e^(iπ) + 1 = 0",
  "F = ma",
  "∫₀¹ x² dx = 1/3",
  "P(A|B) = P(A∩B)/P(B)",
  "a² + b² = c²",
  "O(n log n)",
  "PV = nRT",
  "Σ 1/n² = π²/6",
  "Δx Δp ≥ ℏ/2",
  "∇ × B = μ₀J",
  "x = (-b ± √(b²-4ac)) / 2a",
  "f(x) = Σ aₙxⁿ",
  "0x1F · 1011₂",
  "E = mc²",
  "$ tsc --noEmit",
  "✓ built in 3.42s",
  "$ vite build",
  "▲ deploy --prod",
];

const ENGINEERING_ICONS = [
  Cog,
  CircuitBoard,
  DraftingCompass,
  Ruler,
  Atom,
  Wrench,
  Magnet,
  Orbit,
  Binary,
  BatteryCharging,
  Gauge,
  Cable,
  Fan,
  Disc3,
];

const COLORS = [
  "#e11d48",
  "#7c3aed",
  "#0ea5e9",
  "#ea580c",
  "#0f766e",
  "#be123c",
  "#b45309",
  "#15803d",
  "#9333ea",
  "#0369a1",
];

// 26 equations + 14 icons at fixed positions — stable on re-render.
const scatter = [
  // Equations (rows 0‑4)
  { x: 6,  y: 4,  text: EQUATION_TEXTS[0], rotate: -8,  color: "#e11d48" },
  { x: 18, y: 1,  text: EQUATION_TEXTS[1], rotate:  5,  color: "#7c3aed" },
  { x: 3,  y: 7,  text: EQUATION_TEXTS[2], rotate: -3,  color: "#0ea5e9" },
  { x: 22, y: 2,  text: EQUATION_TEXTS[3], rotate:  7,  color: "#ea580c" },
  { x: 9,  y: 3,  text: EQUATION_TEXTS[4], rotate: -6,  color: "#0f766e" },
  { x: 25, y: 5,  text: EQUATION_TEXTS[5], rotate:  3,  color: "#be123c" },
  { x: 12, y: 0,  text: EQUATION_TEXTS[6], rotate: -4,  color: "#b45309" },
  { x: 7,  y: 8,  text: EQUATION_TEXTS[7], rotate:  6,  color: "#15803d" },
  { x: 16, y: 9,  text: EQUATION_TEXTS[8], rotate: -2,  color: "#9333ea" },
  { x: 20, y: 6,  text: EQUATION_TEXTS[9], rotate:  8,  color: "#0369a1" },

  // Engineering icons (rows 5‑8)
  { x:  2, y: 5,  Icon: Cog,       rotate: 12, color: "#e11d48", size: 36 },
  { x: 24, y: 0,  Icon: CircuitBoard, rotate: -5, color: "#7c3aed", size: 40 },
  { x:  5, y: 3,  Icon: DraftingCompass, rotate: 8, color: "#0ea5e9", size: 42 },
  { x: 14, y: 7,  Icon: Ruler,       rotate: -9, color: "#ea580c", size: 38 },
  { x:  9, y: 5,  Icon: Atom,        rotate:  2, color: "#0f766e", size: 34 },
  { x: 22, y: 1,  Icon: Wrench,      rotate: -11,color: "#be123c", size: 32 },
  { x:  3, y: 9,  Icon: Magnet,      rotate:  4, color: "#b45309", size: 36 },
  { x: 15, y: 6,  Icon: Orbit,       rotate: -6, color: "#15803d", size: 40 },
  { x:  8, y: 4,  Icon: Binary,      rotate:  1, color: "#4d7c0f", size: 30 },
  { x: 23, y: 2,  Icon: BatteryCharging, rotate: 3, color: "#15803d", size: 32 },
  { x: 20, y: 8,  Icon: Gauge,       rotate: -1, color: "#0ea5e9", size: 38 },
  { x:  6, y: 2,  Icon: Cable,       rotate:  9, color: "#ea580c", size: 34 },

  // Warmth extras (rows 9‑10)
  { x: 12, y: 10, Icon: Disc3,     rotate: 0,  color: "#7c3aed", size: 28 },
  { x:  1, y: 10, Icon: Settings,   rotate: 0,  color: "#64748b", size: 24 },
  { x: 10, y: 0,  text: EQUATION_TEXTS[14], rotate: -5, color: "#f4a261" },
  { x: 24, y: 9,  text: EQUATION_TEXTS[15], rotate:  4, color: "#6ee7a8" },
  { x: 14, y: 4,  text: EQUATION_TEXTS[16], rotate: -3, color: "#f4a261" },
  { x:  8, y: 7,  text: EQUATION_TEXTS[17], rotate:  6, color: "#7dd3fc" },
];

export function BgCode() {
  return (
    <div className="bg-code-scene" aria-hidden="true">
      {scatter.map((item, index) =>
        item.Icon ? (
          <span
            key={`eng-${index}`}
            className="bg-eng"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: `rotate(${item.rotate}deg)`,
              color: item.color,
            }}
          >
            <item.Icon size={item.size} strokeWidth={1.5} />
          </span>
        ) : (
          <span
            key={`eq-${index}`}
            className="bg-eq"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              color: item.color,
              fontSize: `0.94rem`,
            }}
          >
            {item.text}
          </span>
        ),
      )}
    </div>
  );
}
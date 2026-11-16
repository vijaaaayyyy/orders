import { Cog, CircuitBoard, DraftingCompass, Ruler, Atom, Wrench, Magnet, Orbit, Binary, BatteryCharging, Gauge, Cable, Fan, Disc3, Bolt, Shell, Plug, Settings, Hammer } from "lucide-react";

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

// Fixed positions — all equations & engineering icons in the MIDDLE of the screen
// (x: 35-68, y: 4-9) so they don't overlap the header or side margins.
const scatter = [
  // Center area (x 35-68, y 4-9)
  { x: 35, y: 4,  text: EQUATION_TEXTS[0],  rotate: -6, color: "#e11d48" },
  { x: 48, y: 5,  Icon: Cog,       rotate: 8,  color: "#0ea5e9", size: 38 },
  { x: 62, y: 6,  text: EQUATION_TEXTS[3],  rotate:  5, color: "#ea580c" },
  { x: 40, y: 7,  Icon: Atom,      rotate: -4, color: "#0f766e", size: 32 },
  { x: 55, y: 8,  text: EQUATION_TEXTS[5],  rotate:  7, color: "#be123c" },
  { x: 42, y: 9,  Icon: Orbit,     rotate:  3, color: "#15803d", size: 36 },
  { x: 68, y: 4,  text: EQUATION_TEXTS[8],  rotate: -2, color: "#9333ea" },
  { x: 33, y: 5,  Icon: Cable,     rotate:  9, color: "#ea580c", size: 34 },
  { x: 50, y: 6,  Icon: Binary,    rotate:  1, color: "#4d7c0f", size: 30 },
  { x: 65, y: 7,  Icon: Wrench,     rotate: -8, color: "#be123c", size: 32 },
  { x: 36, y: 8,  text: EQUATION_TEXTS[10], rotate: -4, color: "#b45309" },
  { x: 58, y: 9,  Icon: Gauge,     rotate:  2, color: "#0ea5e9", size: 36 },
  { x: 45, y: 4,  text: EQUATION_TEXTS[12], rotate:  5, color: "#047857" },
  { x: 72, y: 5,  Icon: BatteryCharging, rotate: -3, color: "#15803d", size: 32 },
  { x: 38, y: 6,  text: EQUATION_TEXTS[1],  rotate:  4, color: "#7c3aed" },
  { x: 52, y: 7,  Icon: CircuitBoard, rotate: -5, color: "#7c3aed", size: 40 },
  { x: 66, y: 8,  text: EQUATION_TEXTS[6],  rotate: -3, color: "#b45309" },
  { x: 40, y: 9,  Icon: DraftingCompass, rotate: 8, color: "#0ea5e9", size: 42 },
  { x: 58, y: 4,  Icon: Ruler,       rotate: -9, color: "#ea580c", size: 38 },
  { x: 42, y: 5,  Icon: Atom,        rotate:  2, color: "#0f766e", size: 34 },
  { x: 60, y: 6,  text: EQUATION_TEXTS[3],  rotate:  5, color: "#ea580c" },
  { x: 34, y: 7,  Icon: Magnet,      rotate:  4, color: "#b45309", size: 36 },
  { x: 50, y: 8,  text: EQUATION_TEXTS[7],  rotate:  6, color: "#15803d" },
  { x: 64, y: 9,  Icon: Orbit,       rotate: -6, color: "#15803d", size: 40 },
  { x: 32, y: 4,  text: EQUATION_TEXTS[10], rotate: -4, color: "#b45309" },
  { x: 48, y: 5,  Icon: Gauge,     rotate:  2, color: "#0ea5e9", size: 36 },
  { x: 62, y: 6,  text: EQUATION_TEXTS[12], rotate:  5, color: "#047857" },
  { x: 36, y: 7,  Icon: BatteryCharging, rotate: -3, color: "#15803d", size: 32 },
  { x: 52, y: 8,  text: EQUATION_TEXTS[14], rotate: -5, color: "#f4a261" },
  { x: 66, y: 9,  Icon: Wrench,     rotate: -8, color: "#be123c", size: 32 },
  { x: 38, y: 10, text: EQUATION_TEXTS[15], rotate:  4, color: "#6ee7a8" },
  { x: 54, y: 4,  Icon: Disc3,     rotate: 0,  color: "#7c3aed", size: 28 },
  { x: 70, y: 5,  text: EQUATION_TEXTS[16], rotate: -3, color: "#f4a261" },
  { x: 44, y: 6,  text: EQUATION_TEXTS[17], rotate:  6, color: "#7dd3fc" },
  { x: 58, y: 7,  Icon: Settings,   rotate: 0,  color: "#64748b", size: 24 },
  { x: 30, y: 8,  text: EQUATION_TEXTS[11], rotate: -7, color: "#be123c" },
  { x: 46, y: 9,  Icon: Binary,    rotate:  1, color: "#4d7c0f", size: 30 },
  { x: 60, y: 10, text: EQUATION_TEXTS[13], rotate:  4, color: "#9333ea" },
  { x: 74, y: 4,  Icon: Cable,     rotate:  9, color: "#ea580c", size: 34 },
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
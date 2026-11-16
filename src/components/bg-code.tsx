import type { CSSProperties } from "react";
import {
  Atom,
  BatteryCharging,
  Binary,
  Bolt,
  Cable,
  CircuitBoard,
  Cog,
  Cpu,
  Disc3,
  DraftingCompass,
  Fan,
  Gauge,
  Hammer,
  Magnet,
  Orbit,
  Plug,
  Radiation,
  Ruler,
  Settings,
  Shell,
  Wrench,
} from "lucide-react";

const ENGINEERING: Array<{
  Icon: typeof Cog;
  top: string;
  left?: string;
  right?: string;
  rotate: string;
  color: string;
  size: number;
}> = [
  { Icon: Bolt, top: "6%", right: "14%", rotate: "14deg", color: "#b45309", size: 30 },
  { Icon: Cog, top: "4%", left: "40%", rotate: "10deg", color: "#0ea5e9", size: 52 },
  { Icon: Atom, top: "12%", left: "22%", rotate: "-6deg", color: "#7c3aed", size: 40 },
  { Icon: Shell, top: "12%", left: "52%", rotate: "8deg", color: "#0f766e", size: 36 },
  { Icon: Cog, top: "20%", left: "6%", rotate: "12deg", color: "#0ea5e9", size: 42 },
  { Icon: Orbit, top: "24%", left: "52%", rotate: "-12deg", color: "#be123c", size: 44 },
  { Icon: CircuitBoard, top: "26%", right: "6%", rotate: "-10deg", color: "#0f766e", size: 40 },
  { Icon: DraftingCompass, top: "33%", left: "44%", rotate: "-8deg", color: "#e11d48", size: 46 },
  { Icon: Magnet, top: "35%", left: "20%", rotate: "6deg", color: "#c2410c", size: 34 },
  { Icon: Wrench, top: "40%", right: "22%", rotate: "-16deg", color: "#0369a1", size: 34 },
  { Icon: Cpu, top: "42%", right: "12%", rotate: "6deg", color: "#9333ea", size: 34 },
  { Icon: Radiation, top: "47%", left: "66%", rotate: "0deg", color: "#b91c1c", size: 38 },
  { Icon: Hammer, top: "52%", left: "55%", rotate: "-10deg", color: "#a16207", size: 34 },
  { Icon: Ruler, top: "57%", left: "41%", rotate: "18deg", color: "#ea580c", size: 42 },
  { Icon: Settings, top: "60%", left: "24%", rotate: "8deg", color: "#4f46e5", size: 38 },
  { Icon: Ruler, top: "63%", left: "8%", rotate: "-18deg", color: "#ea580c", size: 40 },
  { Icon: Plug, top: "68%", right: "26%", rotate: "10deg", color: "#0f766e", size: 32 },
  { Icon: BatteryCharging, top: "72%", left: "52%", rotate: "-6deg", color: "#15803d", size: 36 },
  { Icon: Binary, top: "74%", left: "64%", rotate: "0deg", color: "#4d7c0f", size: 32 },
  { Icon: Binary, top: "80%", left: "16%", rotate: "0deg", color: "#4d7c0f", size: 32 },
  { Icon: Gauge, top: "82%", right: "20%", rotate: "-8deg", color: "#0ea5e9", size: 36 },
  { Icon: DraftingCompass, top: "84%", right: "6%", rotate: "8deg", color: "#7c3aed", size: 44 },
  { Icon: Cable, top: "86%", left: "22%", rotate: "4deg", color: "#0369a1", size: 38 },
  { Icon: CircuitBoard, top: "88%", left: "42%", rotate: "12deg", color: "#0f766e", size: 46 },
  { Icon: Fan, top: "96%", right: "20%", rotate: "0deg", color: "#b45309", size: 38 },
  { Icon: Disc3, top: "96%", left: "30%", rotate: "0deg", color: "#7c3aed", size: 34 },
];

const EQUATIONS: Array<{
  text: string;
  top: string;
  left?: string;
  right?: string;
  rotate: string;
  color: string;
  size?: string;
}> = [
  { text: "e^(iπ) + 1 = 0", top: "9%", left: "2.5%", rotate: "-7deg", color: "#e11d48" },
  { text: "F = ma", top: "16%", left: "31%", rotate: "-3deg", color: "#be123c" },
  { text: "λx. x + 1", top: "16%", right: "2%", rotate: "7deg", color: "#a21caf" },
  { text: "∫₀¹ x² dx = 1/3", top: "30%", left: "1.5%", rotate: "4deg", color: "#7c3aed" },
  { text: "P(A|B) = P(A∩B)/P(B)", top: "37%", right: "1.5%", rotate: "-6deg", color: "#0369a1" },
  { text: "V = IR", top: "46%", left: "33%", rotate: "4deg", color: "#0369a1" },
  { text: "a² + b² = c²", top: "52%", left: "2%", rotate: "-5deg", color: "#0ea5e9" },
  { text: "O(n log n)", top: "58%", right: "2.5%", rotate: "5deg", color: "#c2410c" },
  { text: "PV = nRT", top: "66%", left: "32%", rotate: "-5deg", color: "#ea580c" },
  { text: "Σ 1/n² = π²/6", top: "71%", left: "1.5%", rotate: "6deg", color: "#ea580c" },
  { text: "Δx Δp ≥ ℏ/2", top: "78%", right: "1.5%", rotate: "-8deg", color: "#4d7c0f" },
  { text: "∇ × B = μ₀J", top: "88%", left: "4%", rotate: "-4deg", color: "#0f766e" },
  { text: "τ = r × F", top: "92%", left: "36%", rotate: "6deg", color: "#7c3aed" },
  { text: "x = (-b ± √(b²-4ac)) / 2a", top: "94%", right: "3%", rotate: "3deg", color: "#9333ea" },
  { text: "f(x) = Σ aₙxⁿ", top: "44%", left: "10%", rotate: "8deg", color: "#be123c", size: "0.85rem" },
  { text: "0x1F · 1011₂", top: "64%", right: "10%", rotate: "-9deg", color: "#047857", size: "0.85rem" },
  { text: "E = mc²", top: "7%", left: "68%", rotate: "-4deg", color: "#b91c1c" },
  { text: "CAD · CAM · CNC", top: "8%", left: "60%", rotate: "5deg", color: "#0369a1", size: "0.8rem" },
  { text: "PCB · FPGA · ARM", top: "15%", right: "33%", rotate: "-6deg", color: "#0f766e", size: "0.8rem" },
  { text: "pH = -log[H⁺]", top: "22%", left: "68%", rotate: "6deg", color: "#15803d" },
  { text: "01001000 01101001", top: "29%", left: "30%", rotate: "-3deg", color: "#7c3aed", size: "0.78rem" },
  { text: "∮ B·dl = μ₀I", top: "47%", left: "12%", rotate: "-7deg", color: "#0ea5e9" },
  { text: "σ = F / A", top: "56%", right: "12%", rotate: "4deg", color: "#c2410c" },
  { text: "G m₁m₂ / r²", top: "84%", right: "32%", rotate: "-5deg", color: "#4f46e5" },
  { text: "R · L · C", top: "70%", left: "68%", rotate: "8deg", color: "#be123c", size: "0.82rem" },
  { text: "η = W / Q", top: "90%", left: "64%", rotate: "-4deg", color: "#a16207", size: "0.82rem" },
];

export function BgCode() {
  return (
    <div className="bg-code-scene" aria-hidden="true">
      {EQUATIONS.map((eq) => (
        <span
          key={eq.text}
          className="bg-eq"
          style={
            {
              top: eq.top,
              left: eq.left,
              right: eq.right,
              color: eq.color,
              fontSize: eq.size,
              "--tilt": eq.rotate,
            } as CSSProperties
          }
        >
          {eq.text}
        </span>
      ))}
      {ENGINEERING.map(({ Icon, top, left, right, rotate, color, size }, index) => (
        <span
          key={`eng-${index}`}
          className="bg-eng"
          style={{ top, left, right, color, transform: `rotate(${rotate})` }}
        >
          <Icon size={size} strokeWidth={1.5} />
        </span>
      ))}
    </div>
  );
}

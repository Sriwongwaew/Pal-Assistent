"use client";

/* Dumb: boxens styrkor som en sexkantig radar. Värdena kommer färdiga från
   `boxStrengths` (0–100); komponenten ritar bara. Färgerna går via tema-tokens
   (currentColor/--acc) så båda lägena och alla paletter håller kontrasten. */

export interface RadarAxis {
  label: string;
  value: number;
}

const CX = 100;
const CY = 92;
const R = 70;

/** Hörnpunkt för axel `i` av `n` på radie `k` (0–1). Första axeln pekar uppåt. */
function point(i: number, n: number, k: number): [number, number] {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  return [CX + Math.cos(a) * R * k, CY + Math.sin(a) * R * k];
}

const ring = (n: number, k: number): string =>
  Array.from({ length: n }, (_, i) => point(i, n, k).join(",")).join(" ");

export function RadarChart({ axes }: { axes: RadarAxis[] }) {
  const n = axes.length;
  const value = axes
    .map((ax, i) => point(i, n, Math.max(0.04, ax.value / 100)).join(","))
    .join(" ");

  return (
    <svg className="radar" viewBox="0 0 200 184" role="img" aria-label={axes.map((a) => `${a.label} ${a.value}`).join(", ")}>
      <g fill="none" stroke="var(--line2)">
        <polygon points={ring(n, 1)} />
        <polygon points={ring(n, 2 / 3)} opacity=".6" />
        <polygon points={ring(n, 1 / 3)} opacity=".45" />
      </g>
      <polygon
        points={value}
        fill="color-mix(in srgb, var(--acc) 30%, transparent)"
        stroke="var(--acc)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {axes.map((ax, i) => {
        const [x, y] = point(i, n, 1.22);
        return (
          <text
            key={ax.label}
            x={x} y={y + 3}
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="800"
            fill="var(--ink2)"
          >
            {ax.label}
          </text>
        );
      })}
    </svg>
  );
}

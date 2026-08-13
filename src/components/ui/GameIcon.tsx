/* Dumb: spelets riktiga UI-ikoner (webp ur spelfilerna, i /public/icons). */
/* eslint-disable @next/next/no-img-element */
import type { CSSProperties } from "react";

export function GameIcon({ name, size = 16, style }: { name: string; size?: number; style?: CSSProperties }) {
  return (
    <img
      src={`/icons/${name}.webp`}
      width={size}
      height={size}
      alt=""
      aria-hidden
      style={{ objectFit: "contain", display: "inline-block", verticalAlign: "middle", ...style }}
    />
  );
}

/* Item-ikon (material, ranchvara, vapen) ur /icons/items – uppslag via
   itemIconSlug, och namn utan belagd ikon ritar ingenting alls: en gissad
   bild ser lika trovärdig ut som en riktig (se src/lib/itemIcons.ts). */
export function ItemIcon({ slug, size = 20 }: { slug: string | null; size?: number }) {
  if (!slug) return null;
  return (
    <img
      src={`/icons/items/${slug}.webp`}
      width={size}
      height={size}
      alt=""
      aria-hidden
      style={{ objectFit: "contain", display: "inline-block", verticalAlign: "middle", flex: "none" }}
    />
  );
}

/** Vit spelikon tonad i valfri färg via CSS-mask (för pilar/stat-glyfer som spelet färgsätter). */
export function MaskIcon({ name, color, width = 18, height = 16 }: { name: string; color: string; width?: number; height?: number }) {
  const mask = `url(/icons/${name}.webp)`;
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block", width, height, backgroundColor: color, flex: "none",
        WebkitMaskImage: mask, maskImage: mask,
        WebkitMaskSize: "contain", maskSize: "contain",
        WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
        WebkitMaskPosition: "center", maskPosition: "center",
      }}
    />
  );
}

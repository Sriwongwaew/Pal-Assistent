"use client";

/* Dumb-ish: Habitats bakgrundsstruktur, ritad i canvas.
   Varje palett har sin egen struktur – horisontband + stjärnfält (dusk),
   stenkorn (basalt), höjdkurvor (nightwood), penseldrag (graphite),
   frostkristaller (glacier), halvtonsraster (press) och mätarsvep (instrument).
   Mönstret är deterministiskt (egen LCG, ingen Math.random) så det inte
   flimrar mellan omritningar. */
import { useEffect, useRef } from "react";

type Pal =
  | "dusk" | "basalt" | "nightwood"
  | "graphite" | "glacier" | "press" | "instrument";

/** Deterministisk LCG – samma frö ger samma mönster vid varje omritning. */
function lcg(seed: number) {
  return () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
}

/** Läser av vilket läge <html> faktiskt hamnat i just nu. */
function readState(): { pal: Pal; dark: boolean } {
  const el = document.documentElement;
  const pal = (el.dataset.pal as Pal) || "dusk";
  const theme = el.dataset.theme;
  const dark = theme === "dark"
    || (theme !== "light" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  return { pal, dark };
}

function draw(cv: HTMLCanvasElement) {
  const { pal, dark } = readState();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth;
  const h = window.innerHeight;
  cv.width = Math.round(w * dpr);
  cv.height = Math.round(h * dpr);
  cv.style.width = `${w}px`;
  cv.style.height = `${h}px`;

  const g = cv.getContext("2d");
  if (!g) return;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);

  if (pal === "nightwood") {
    g.strokeStyle = dark ? "rgba(140,220,190,.085)" : "rgba(40,90,70,.085)";
    g.lineWidth = 1.2;
    const cx = w * 0.22, cy = h * 0.62, span = Math.max(w, h) * 1.5;
    for (let r = 40; r < span; r += 27) {
      g.beginPath();
      for (let i = 0; i <= 180; i++) {
        const a = (i / 180) * Math.PI * 2;
        const rr = r + 30 * Math.sin(3 * a + r * 0.021) + 16 * Math.cos(5 * a - r * 0.013)
          + 9 * Math.sin(8 * a + r * 0.03);
        const x = cx + rr * Math.cos(a) * 1.18;
        const y = cy + rr * Math.sin(a) * 0.86;
        if (i) g.lineTo(x, y); else g.moveTo(x, y);
      }
      g.closePath();
      g.stroke();
    }
    return;
  }

  if (pal === "dusk") {
    /* Skymningens horisontband: flacka vågor som tätnar mot nederkanten, som
       ljusbanden i en solnedgång. I mörkt läge dessutom ett glest stjärnfält
       på övre halvan – deterministiskt, precis som basaltens korn. */
    g.strokeStyle = dark ? "rgba(200,185,255,.09)" : "rgba(120,80,60,.075)";
    g.lineWidth = 1.1;
    for (let i = 0; i < 14; i++) {
      const y = h * (0.30 + Math.pow(i / 14, 1.35) * 0.75);
      g.beginPath();
      for (let x = 0; x <= w; x += 10) {
        const yy = y + 7 * Math.sin(x * 0.004 + i * 1.7) + 3 * Math.sin(x * 0.013 - i);
        if (x) g.lineTo(x, yy); else g.moveTo(x, yy);
      }
      g.stroke();
    }
    if (dark) {
      const rnd = lcg(20260810);
      g.fillStyle = "rgba(230,220,255,.35)";
      const stars = Math.round(w / 9);
      for (let i = 0; i < stars; i++) {
        const x = rnd() * w, y = rnd() * rnd() * h * 0.45, r = rnd() * 0.9 + 0.3;
        g.beginPath();
        g.arc(x, y, r, 0, Math.PI * 2);
        g.fill();
      }
    }
    return;
  }

  if (pal === "press") {
    // Halvtonsraster: ett jämnt punktnät är tryckets egen struktur.
    g.fillStyle = dark ? "rgba(255,255,255,.05)" : "rgba(20,20,20,.055)";
    const step = 7;
    for (let y = 0; y < h + step; y += step) {
      // Varannan rad förskjuten halva steget – ett rakt nät blir ett rutmönster.
      const off = (Math.round(y / step) % 2) * (step / 2);
      for (let x = 0; x < w + step; x += step) {
        g.beginPath();
        g.arc(x + off, y, 0.85, 0, Math.PI * 2);
        g.fill();
      }
    }
    return;
  }

  if (pal === "instrument") {
    // Mätarsvep: koncentriska bågar ur nedre högra hörnet, med skalstreck.
    const cx = w * 1.02, cy = h * 1.06;
    const span = Math.hypot(w, h) * 1.1;
    for (let r = 90; r < span; r += 78) {
      g.strokeStyle = dark ? "rgba(140,200,220,.075)" : "rgba(15,45,70,.06)";
      g.lineWidth = 1;
      g.beginPath();
      g.arc(cx, cy, r, Math.PI, Math.PI * 1.5);
      g.stroke();
      // Skalstreck vart 5:e grad längs bågen – instrumentets gradering.
      g.strokeStyle = dark ? "rgba(140,200,220,.11)" : "rgba(15,45,70,.09)";
      for (let d = 180; d <= 270; d += 5) {
        const a = (d * Math.PI) / 180;
        const long = d % 15 === 0;
        const t = long ? 9 : 4.5;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        g.lineTo(cx + Math.cos(a) * (r + t), cy + Math.sin(a) * (r + t));
        g.stroke();
      }
    }
    return;
  }

  if (pal === "graphite") {
    // Penseldrag i metall: lodräta streck med olika längd och styrka. Ingen
    // kulör alls – paletten går ut på att elementet är skärmens enda färg.
    const rnd = lcg(20260813);
    g.lineWidth = 1;
    const streaks = Math.round(w / 7);
    for (let i = 0; i < streaks; i++) {
      const x = Math.round(rnd() * w) + 0.5;
      const y0 = rnd() * h * 0.9;
      const len = h * (0.15 + rnd() * 0.7);
      const a = 0.018 + rnd() * 0.03;
      g.strokeStyle = dark ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
      g.beginPath();
      g.moveTo(x, y0);
      g.lineTo(x, Math.min(h, y0 + len));
      g.stroke();
    }
    return;
  }

  if (pal === "glacier") {
    // Frostkristaller: korta streck i tre fasta vinklar, som is på en ruta.
    // Fasta vinklar är hela skillnaden mot brus – slumpas de blir det grus.
    const rnd = lcg(20260816);
    g.lineWidth = 1;
    const shards = Math.round((w * h) / 5200);
    for (let i = 0; i < shards; i++) {
      const x = rnd() * w, y = rnd() * h;
      const a = (Math.floor(rnd() * 3) * Math.PI) / 3 + 0.18;
      const len = 14 + rnd() * rnd() * 70;
      const al = 0.03 + rnd() * 0.055;
      g.strokeStyle = dark ? `rgba(190,235,250,${al})` : `rgba(25,80,105,${al})`;
      g.beginPath();
      g.moveTo(x - (Math.cos(a) * len) / 2, y - (Math.sin(a) * len) / 2);
      g.lineTo(x + (Math.cos(a) * len) / 2, y + (Math.sin(a) * len) / 2);
      g.stroke();
    }
    return;
  }

  // basalt: stenkorn + mycket svaga konturer
  const rnd = lcg(20260808);
  g.fillStyle = dark ? "rgba(255,255,255,.055)" : "rgba(0,0,0,.05)";
  const grains = Math.round((w * h) / 190);
  for (let i = 0; i < grains; i++) {
    const x = rnd() * w, y = rnd() * h, r = rnd() * rnd() * 2.6 + 0.35;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.strokeStyle = dark ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.035)";
  g.lineWidth = 1;
  const cx = w * 0.28, cy = h * 0.55, span = Math.max(w, h) * 1.5;
  for (let r = 120; r < span; r += 96) {
    g.beginPath();
    for (let i = 0; i <= 150; i++) {
      const a = (i / 150) * Math.PI * 2;
      const rr = r + 34 * Math.sin(2.4 * a + r * 0.017) + 15 * Math.cos(4 * a - r * 0.01);
      const x = cx + rr * Math.cos(a) * 1.2;
      const y = cy + rr * Math.sin(a) * 0.8;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    }
    g.closePath();
    g.stroke();
  }
}

export function BgTexture() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const redraw = () => draw(cv);
    redraw();

    // Rita om när fönstret ändras, när temat/paletten byts på <html>
    // och när systemets färgläge ändras (relevant i "system"-läget).
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(redraw);
    };
    window.addEventListener("resize", onResize);

    const mo = new MutationObserver(redraw);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-pal"] });

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", redraw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      mo.disconnect();
      mq.removeEventListener("change", redraw);
    };
  }, []);

  return <canvas ref={ref} className="bgtex" aria-hidden />;
}

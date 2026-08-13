"use client";

/* Dumb-ish: Habitats bakgrundsstruktur, ritad i canvas.
   Varje palett har sin egen struktur – stenkorn (basalt), höjdkurvor
   (nightwood), vattenstrata (deepwater) och horisontband + stjärnfält (dusk).
   Mönstret är deterministiskt (egen LCG, ingen Math.random) så det inte
   flimrar mellan omritningar. */
import { useEffect, useRef } from "react";

type Pal = "basalt" | "nightwood" | "deepwater" | "dusk";

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

  if (pal === "deepwater") {
    g.strokeStyle = dark ? "rgba(120,200,240,.10)" : "rgba(20,80,120,.09)";
    g.lineWidth = 1.1;
    for (let y = -40; y < h + 40; y += 21) {
      g.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const yy = y + 13 * Math.sin(x * 0.0062 + y * 0.021) + 6 * Math.sin(x * 0.017 - y * 0.011);
        if (x) g.lineTo(x, yy); else g.moveTo(x, yy);
      }
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
      let seed = 20260810;
      const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
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

  // basalt: stenkorn + mycket svaga konturer
  let seed = 20260808;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
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

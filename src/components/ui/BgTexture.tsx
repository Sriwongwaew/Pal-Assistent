"use client";

/* Dumb-ish: Habitats bakgrundsstruktur, ritad i canvas.
   Varje palett har sin egen struktur – stenkorn (basalt), höjdkurvor
   (nightwood), vattenstrata (deepwater), horisontband + stjärnfält (dusk),
   rutat papper (fieldbook), penseldrag (graphite), sprickor + glöd (ember),
   kronblad (sakura) och frostkristaller (glacier).
   Mönstret är deterministiskt (egen LCG, ingen Math.random) så det inte
   flimrar mellan omritningar. */
import { useEffect, useRef } from "react";

type Pal =
  | "basalt" | "nightwood" | "deepwater" | "dusk"
  | "fieldbook" | "graphite" | "ember" | "sakura" | "glacier";

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

  if (pal === "fieldbook") {
    /* Rutat papper: varje femte linje kraftigare, som i ett anteckningsblock.
       Heltal + .5 gör linjen exakt en pixel bred – annars blir rutnätet suddigt
       och ser ut som en tryckfelaktig gradient i stället för ett rutnät. */
    const minor = dark ? "rgba(120,200,255,.055)" : "rgba(30,50,80,.05)";
    const major = dark ? "rgba(120,200,255,.10)" : "rgba(30,50,80,.09)";
    const step = 26;
    g.lineWidth = 1;
    for (let i = 0, x = 0; x <= w; i++, x += step) {
      g.strokeStyle = i % 5 === 0 ? major : minor;
      g.beginPath();
      g.moveTo(Math.round(x) + 0.5, 0);
      g.lineTo(Math.round(x) + 0.5, h);
      g.stroke();
    }
    for (let i = 0, y = 0; y <= h; i++, y += step) {
      g.strokeStyle = i % 5 === 0 ? major : minor;
      g.beginPath();
      g.moveTo(0, Math.round(y) + 0.5);
      g.lineTo(w, Math.round(y) + 0.5);
      g.stroke();
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

  if (pal === "ember") {
    // Sprickor som växer uppåt ur nederkanten, plus glödpunkter längst ner.
    const rnd = lcg(20260814);
    g.strokeStyle = dark ? "rgba(255,150,80,.11)" : "rgba(120,45,20,.08)";
    g.lineWidth = 1.2;
    const cracks = 9;
    for (let i = 0; i < cracks; i++) {
      let x = (i + rnd() * 0.8) * (w / cracks);
      let y = h + 20;
      let dir = -Math.PI / 2 + (rnd() - 0.5) * 0.5;
      g.beginPath();
      g.moveTo(x, y);
      const segs = 14 + Math.round(rnd() * 10);
      for (let s = 0; s < segs && y > -30; s++) {
        dir += (rnd() - 0.5) * 0.55;
        const len = 22 + rnd() * 40;
        x += Math.cos(dir) * len;
        y += Math.sin(dir) * len;
        g.lineTo(x, y);
      }
      g.stroke();
    }
    g.fillStyle = dark ? "rgba(255,140,60,.26)" : "rgba(180,70,25,.15)";
    for (let i = 0; i < 26; i++) {
      // rnd()² drar punkterna mot nederkanten – glöden ligger i botten.
      const x = rnd() * w, y = h - rnd() * rnd() * h * 0.55, r = rnd() * 1.4 + 0.4;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    return;
  }

  if (pal === "sakura") {
    // Kronblad: två bezierkurvor per blad, slumpat vridna men deterministiskt.
    const rnd = lcg(20260815);
    g.fillStyle = dark ? "rgba(255,170,205,.10)" : "rgba(170,70,120,.085)";
    const petals = Math.round((w * h) / 9000);
    for (let i = 0; i < petals; i++) {
      const s = 3 + rnd() * 5;
      g.save();
      g.translate(rnd() * w, rnd() * h);
      g.rotate(rnd() * Math.PI);
      g.beginPath();
      g.moveTo(0, 0);
      g.bezierCurveTo(s * 0.9, -s * 0.5, s * 1.5, s * 0.35, 0, s * 1.25);
      g.bezierCurveTo(-s * 1.5, s * 0.35, -s * 0.9, -s * 0.5, 0, 0);
      g.fill();
      g.restore();
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

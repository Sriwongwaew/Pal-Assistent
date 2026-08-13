"use client";

/* Dumb: en siffra som räknar upp sig till sitt värde när den kommer i bild.
   Wow-lagret från designrundan – och inget mer: värdet är alltid detsamma,
   bara vägen dit animeras. Den som bett om stillhet (prefers-reduced-motion)
   får slutvärdet direkt, och servern renderar alltid slutvärdet så att
   sidan är korrekt även utan JS. */
import { useEffect, useRef, useState } from "react";

export function CountUp({ to, duration = 700 }: { to: number; duration?: number }) {
  const [value, setValue] = useState(to);
  const ref = useRef<HTMLSpanElement>(null);
  const played = useRef(false);

  useEffect(() => {
    if (played.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting) || played.current) return;
      played.current = true;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / duration);
        // Ease-out: de sista siffrorna landar mjukt i stället för att hoppa.
        setValue(Math.round(to * (1 - (1 - k) ** 3)));
        if (k < 1) requestAnimationFrame(tick);
      };
      setValue(0);
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);

  return <span ref={ref}>{value}</span>;
}

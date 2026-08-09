"use client";

/* Dumb: sidans rubrik i innehållsytan. Skenan visar var man är, men
   sidan behöver ändå en riktig h1 – inte minst på smala skärmar. */
import { usePathname } from "next/navigation";

const TITLES: Record<string, string> = {
  "/": "Översikt",
  "/box": "Boxen",
  "/breeding": "Breeding",
  "/rekommendationer": "Rekommendationer",
  "/bast-for": "Bäst för…",
};

export function PageTitle() {
  const pathname = usePathname();
  return <h1>{TITLES[pathname] ?? "PalAssistent"}</h1>;
}

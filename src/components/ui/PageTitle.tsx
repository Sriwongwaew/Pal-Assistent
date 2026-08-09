"use client";

/* Dumb: the page heading inside the content area. The rail shows where you
   are, but the page still needs a real h1 — not least on narrow screens. */
import { usePathname } from "next/navigation";
import { useT } from "@/i18n/LocaleContext";
import type { MessageKey } from "@/i18n";

const TITLES: Record<string, MessageKey> = {
  "/": "nav.overview",
  "/box": "nav.box",
  "/breeding": "nav.breeding",
  "/recommendations": "nav.recommendations",
  "/best-for": "nav.bestFor",
};

export function PageTitle() {
  const pathname = usePathname();
  const t = useT();
  const key = TITLES[pathname];
  return <h1>{key ? t(key) : t("meta.title")}</h1>;
}

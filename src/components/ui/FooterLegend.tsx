"use client";

import { useT } from "@/i18n/LocaleContext";
import { useRichT } from "@/i18n/rich";
import { PassiveRow } from "./PassiveRow";

export function FooterLegend() {
  const t = useT();
  const rich = useRichT();

  return (
    <footer>
      {t("footer.source")}{" "}
      {rich("footer.hover", { action: <b>{t("footer.hoverAction")}</b> })}
      <div className="plegend">
        <PassiveRow name={t("footer.tier13")} tier={3} />
        <PassiveRow name={t("footer.tier4")} tier={4} />
        <PassiveRow name={t("footer.tier5")} tier={5} />
        <PassiveRow name={t("footer.tierNeg")} tier={-1} />
      </div>
    </footer>
  );
}

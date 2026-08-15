import type { Metadata } from "next";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import "@fontsource/m-plus-rounded-1c/400.css";
import "@fontsource/m-plus-rounded-1c/500.css";
import "@fontsource/m-plus-rounded-1c/800.css";
import "@fontsource/zen-kaku-gothic-new/500.css";
import "@fontsource/zen-kaku-gothic-new/700.css";
import "@fontsource/zen-kaku-gothic-new/900.css";
import { PalDataProvider } from "@/context/PalDataContext";
import { SelectedPalProvider } from "@/context/SelectedPalContext";
import { UpdateProvider } from "@/context/UpdateContext";
import { PalDetailHost } from "@/components/containers/PalDetailHost";
import { SaveImport } from "@/components/containers/SaveImport";
import { UpdateBanner } from "@/components/containers/UpdateBanner";
import { BgTexture } from "@/components/ui/BgTexture";
import { FooterLegend } from "@/components/ui/FooterLegend";
import { HeaderMeta } from "@/components/ui/HeaderMeta";
import { GoalWatch } from "@/components/ui/GoalWatch";
import { PageTitle } from "@/components/ui/PageTitle";
import { PassiveTipHost } from "@/components/ui/PassiveTip";
import { Rail } from "@/components/ui/Rail";
import { htmlLang, LOCALE_KEY, normalizeLocale, type Locale } from "@/i18n/config";
import { LocaleProvider } from "@/i18n/LocaleContext";
import { translate } from "@/i18n";
import "./globals.css";

/* The language is read from a cookie rather than guessed on the client, so the
   very first paint is already in the right language. See LocaleContext. */
async function activeLocale(): Promise<Locale> {
  const store = await cookies();
  return normalizeLocale(store.get(LOCALE_KEY)?.value);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await activeLocale();
  return {
    title: translate(locale, "meta.title"),
    description: translate(locale, "meta.description"),
  };
}

/* Sets theme and palette on <html> BEFORE the first paint, otherwise the page
   flashes in the wrong mode for one frame. The keys match ThemeControls. */
const themeInit = `(function(){try{var d=document.documentElement,
t=localStorage.getItem("pa-theme"),p=localStorage.getItem("pa-pal");
if(t==="light"||t==="dark")d.dataset.theme=t;
d.dataset.pal="dusk basalt nightwood graphite glacier press instrument".split(" ").indexOf(p)>=0?p:"press";
}catch(e){document.documentElement.dataset.pal="press";}})();`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await activeLocale();

  return (
    <html lang={htmlLang(locale)} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <LocaleProvider initial={locale}>
          <BgTexture />
          <PalDataProvider>
            <SelectedPalProvider>
              {/* Bandet högst upp och knappen i foten läser samma koll, så de
                  aldrig kan säga olika saker om samma version. */}
              <UpdateProvider>
                <div className="shell">
                  <Rail />
                  <div className="content">
                    <div className="wrap">
                      <UpdateBanner />
                      <div className="headrow">
                        <PageTitle />
                        <HeaderMeta />
                        <SaveImport />
                      </div>
                      {/* Målbevakningen ligger under rubriken och på VARJE sida:
                          live-läget läser om saven medan man spelar, och då står
                          man sällan på planeraren. Målbilden kommer ur samma
                          sparade val som avelssidan. */}
                      <GoalWatch />
                      <main>{children}</main>
                      <FooterLegend />
                    </div>
                  </div>
                </div>
              </UpdateProvider>
              <PalDetailHost />
              {/* One host for the whole page: every banner with data-passive
                  gets a hover card. Sits outside .shell so the card is not
                  clipped by anything that scrolls. */}
              <PassiveTipHost />
            </SelectedPalProvider>
          </PalDataProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}

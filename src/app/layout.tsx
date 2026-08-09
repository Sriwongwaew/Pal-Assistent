import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource/m-plus-rounded-1c/400.css";
import "@fontsource/m-plus-rounded-1c/500.css";
import "@fontsource/m-plus-rounded-1c/800.css";
import "@fontsource/zen-kaku-gothic-new/500.css";
import "@fontsource/zen-kaku-gothic-new/700.css";
import "@fontsource/zen-kaku-gothic-new/900.css";
import { PalDataProvider } from "@/context/PalDataContext";
import { SelectedPalProvider } from "@/context/SelectedPalContext";
import { PalDetailHost } from "@/components/containers/PalDetailHost";
import { SaveImport } from "@/components/containers/SaveImport";
import { UpdateBanner } from "@/components/containers/UpdateBanner";
import { BgTexture } from "@/components/ui/BgTexture";
import { FooterLegend } from "@/components/ui/FooterLegend";
import { HeaderMeta } from "@/components/ui/HeaderMeta";
import { PageTitle } from "@/components/ui/PageTitle";
import { Rail } from "@/components/ui/Rail";
import "./globals.css";

export const metadata: Metadata = {
  title: "PalAssistent",
  description: "Palworld-assistent byggd från Level.sav – box, breeding-planerare och rekommendationer",
};

/* Sätter tema och palett på <html> INNAN första målningen, annars blinkar
   sidan i fel läge en bildruta. Nycklarna är samma som i ThemeControls. */
const themeInit = `(function(){try{var d=document.documentElement,
t=localStorage.getItem("pa-theme"),p=localStorage.getItem("pa-pal");
if(t==="light"||t==="dark")d.dataset.theme=t;
d.dataset.pal=(p==="nattskog"||p==="djupvatten")?p:"basalt";
}catch(e){document.documentElement.dataset.pal="basalt";}})();`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="sv" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <BgTexture />
        <PalDataProvider>
          <SelectedPalProvider>
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
                  <main>{children}</main>
                  <FooterLegend />
                </div>
              </div>
            </div>
            <PalDetailHost />
          </SelectedPalProvider>
        </PalDataProvider>
      </body>
    </html>
  );
}

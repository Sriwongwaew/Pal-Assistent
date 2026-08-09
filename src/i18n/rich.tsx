"use client";

/* Sentences that contain markup.

   This app explains itself in prose, and the emphasis usually falls in the
   middle of a sentence — "hover a banner", "what you feed is gone for good".
   Splitting such a sentence into before/bold/after keys breaks the moment a
   language puts the words in another order, and putting <b> inside the
   catalogue means every translator is editing HTML.

   So the catalogue keeps one whole sentence with a named placeholder, and the
   component says what that placeholder renders as. */

import { Fragment, type ReactNode } from "react";
import { useLocale } from "./LocaleContext";
import { translate, type MessageKey, type Vars } from "./index";

export type Nodes = Record<string, ReactNode>;

export function useRichT() {
  const { locale } = useLocale();

  return (key: MessageKey, nodes: Nodes, vars?: Vars): ReactNode[] => {
    // translate() fills the plain vars and leaves unknown placeholders intact,
    // which is exactly the set we are about to replace with nodes.
    const template = translate(locale, key, vars);
    const out: ReactNode[] = [];
    const pattern = /\{(\w+)\}/g;
    let last = 0;
    let match: RegExpExecArray | null;
    let n = 0;

    while ((match = pattern.exec(template)) !== null) {
      if (match.index > last) out.push(template.slice(last, match.index));
      const node = nodes[match[1]!];
      // An unknown placeholder is left as written rather than dropped: visible
      // in review, harmless on screen.
      out.push(node === undefined ? match[0] : <Fragment key={n++}>{node}</Fragment>);
      last = match.index + match[0].length;
    }
    if (last < template.length) out.push(template.slice(last));
    return out;
  };
}

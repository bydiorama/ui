import type { ReactElement } from "react";
import { actions } from "./actions";
import { forms } from "./forms";
import { navigation } from "./navigation";
import { overlays } from "./overlays";
import { display } from "./display";
import { feedback } from "./feedback";
import { media } from "./media";
import { data } from "./data";
import { conversation } from "./conversation";
import { utilities } from "./utilities";

/**
 * The catalog's tiles show a small drawing of each component (Paper:
 * "Components v2 — Motifs · 1440"), not the live component: a drawing can
 * show the moment that explains the part (a menu open, a crop in progress, a
 * run on step three), and 63 of them cost no JavaScript. They are drawn in
 * the theme's roles only, so brand and scheme re-paint them like the rest of
 * the page. Each family keeps its drawings, and their styles, in one file,
 * keyed by the catalog item's name.
 */
const motifs: Record<string, () => ReactElement> = {
  ...actions, ...forms, ...navigation, ...overlays, ...display,
  ...feedback, ...media, ...data, ...conversation, ...utilities,
};

export const hasMotif = (name: string) => Object.hasOwn(motifs, name);

export function Motif({ name }: { name: string }) {
  const Drawing = motifs[name];
  return Drawing ? <Drawing /> : null;
}

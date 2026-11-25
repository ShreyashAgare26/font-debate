// Shared app state: which screen is showing and the match in progress.
import type { Fighter } from "./characters";
import type { Criterion, Font, Pairing } from "./logic";
import { $ } from "./util";

export type Screen = "welcome" | "brief" | "lineup" | "fight" | "verdict";

/** One brief and everything that happens to it: lineup, debate, verdict. */
export interface Match {
  name: string;
  desc: string;
  /** One round per criterion. */
  criteria: Criterion[];
  recommended: Font[];
  /** The three fonts on stage; starts as `recommended`, the user can swap any. */
  lineup: Font[];
  fighters: Fighter[];
  round: number;
  winner: Fighter | null;
  /** The font the user leaves with: the winner unless they overrule it. */
  final: Font | null;
  pairs: Pairing[];
  /** Index into `pairs`, or -1 for "on its own". */
  pairIdx: number;
  /** The pairing partner standing next to the winner. */
  partner: Fighter | null;
  /** The font picker is open to choose the final font, not to swap a contender. */
  pickForVerdict: boolean;
}

export const app = {
  match: null as Match | null,
  /** A scripted sequence (opening, round, ceremony) is playing. */
  busy: false,
  screen: "welcome" as Screen,
};
/** The current match. Only call from code that runs while one exists. */
export function match(): Match {
  if (!app.match) throw new Error("No match in progress");
  return app.match;
}

const PANELS: Record<Screen, string> = { welcome: "welcome", brief: "brief", lineup: "lineup", fight: "hud", verdict: "verdict" };
export function showScreen(name: Screen): void {
  app.screen = name;
  for (const id of ["welcome", "brief", "lineup", "hud", "verdict", "picker"]) $(id).classList.toggle("hidden", PANELS[name] !== id);
}

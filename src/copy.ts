// The words of the show: round titles, boasts and example briefs.
import type { Tone, Use } from "./logic";

/** [round title, what it tests, the leader's boast] */
export const ROUND_COPY: Record<Use, [title: string, sub: string, boast: string]> = {
  ui: ["App / UI test", "Can it label a button at 14px?", "At 14px I'm still crisp."],
  head: ["Headline test", "Your name, big and loud.", "Put me in a hero section and watch."],
  read: ["Long reading test", "A real paragraph at body size.", "Three paragraphs of me and your eyes won't complain."],
  num: ["Numbers test", "Prices, IDs, look-alike characters.", "My 0 is not an O, and my 1 is not an l."],
  brand: ["Brand test", "Does it look like a logo?", "That's not just text. That's a wordmark."],
};
export const TONE_LINES: Record<Tone, string> = {
  playful: "I bring the fun without trying too hard.", serious: "When it matters, people take me seriously.",
  luxury: "I don't need a price tag to look expensive.", technical: "I look like I ship to production.",
  friendly: "People feel welcome the second they see me.", editorial: "I was made for stories worth reading.",
  retro: "I've got nostalgia in every curve.", bold: "Quiet is not my thing.", calm: "Breathe. I keep things easy on the eyes.",
  trustworthy: "You'd hand me your bank details. Admit it.",
};
export interface Example { label: string; name: string; desc: string; uses: Use[] }
export const EXAMPLES: Example[] = [
  { label: "Student fintech", name: "Paywise", desc: "A budgeting app for college students. Should feel friendly and a bit fun, but people trust it with their money.", uses: ["ui", "head", "num"] },
  { label: "Luxury candles", name: "Maison Ombre", desc: "Hand-poured luxury candles sold in boutique stores. Elegant and calm, with an editorial feel.", uses: ["head", "brand", "read"] },
  { label: "Developer tool", name: "Stackbeam", desc: "An API monitoring tool for developers. Technical and precise, but calm when things break.", uses: ["ui", "num", "head"] },
  { label: "Kids reading app", name: "Tiny Tales", desc: "A reading app for kids aged 5 to 8. Playful, friendly and very easy to read.", uses: ["read", "head", "brand"] },
];

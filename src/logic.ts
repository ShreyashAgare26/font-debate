// Pure data and scoring for Font Debate. No DOM, so it runs in tests and in the browser alike.
import { GOOGLE_FONTS, type Kind } from "./data/google-fonts";
export type { Kind };

export const TONES = ["playful", "serious", "luxury", "technical", "friendly", "editorial", "retro", "bold", "calm", "trustworthy"] as const;
export type Tone = (typeof TONES)[number];
export const USES = { ui: "App / UI", head: "Headlines", read: "Long reading", num: "Numbers & data", brand: "Logo / brand" } as const;
export type Use = keyof typeof USES;
export const USE_KEYS = Object.keys(USES) as Use[];

/** One thing the brief asks of a font: a personality trait or a place it will be used. Each becomes a round. */
export type Criterion = { kind: "tone"; key: Tone } | { kind: "use"; key: Use };

export interface Font {
  name: string;
  cat: Kind;
  /** Opening pitch and the weakness rivals attack. */
  pro: string;
  con: string;
  tone: Record<Tone, number>;
  use: Record<Use, number>;
  /** Hand-scored (trusted) or estimated from Google's metadata. */
  curated?: boolean;
  estimated?: boolean;
  weights: number[];
  pop: number;
  flags: string;
  thick: number;
  width: number;
}
/** A font in a match: the same data plus hit points. */
export type Contender = Font & { hp: number };

const KEYWORDS: Record<Tone, string> = {
  playful: "fun game kids playful social gen z meme creative party toy cute",
  serious: "law legal enterprise government medical serious b2b insurance compliance professional",
  luxury: "luxury fashion premium beauty jewelry jewellery perfume hotel wine elegant boutique couture",
  technical: "dev developer code api ai saas crypto data analytics tech startup cloud tool platform",
  friendly: "friendly community education learn student family pet wellness food warm kind welcoming",
  editorial: "blog news magazine journal writing book publication editorial newsletter story essay",
  retro: "retro vintage 90s 80s 70s nostalgia nostalgic classic old school throwback",
  bold: "bold sport sports fitness gym music festival loud energy gaming esports streetwear",
  calm: "calm meditation mindful minimal clean simple sleep spa quiet focus",
  trustworthy: "trust secure security finance bank banking payment payments fintech money health insurance reliable",
};

// t = tone scores in TONES order (0-5), u = [ui, head, read, num, brand] (0-5)
type Row = [name: string, cat: Kind, t: number[], u: number[], pro: string, con: string];
const ROWS: Row[] = [
  ["Inter","Sans",[1,4,1,4,3,2,0,2,4,5],[5,3,4,5,2],"Built for screens. A tall x-height and tabular figures keep tiny UI text sharp.","So common it reads as 'default'. Nobody remembers a brand set in it."],
  ["Roboto","Sans",[1,3,0,4,3,1,0,2,4,4],[5,2,4,4,1],"Android's own voice. Your users already trust it without noticing.","Feels like a system setting, not a brand."],
  ["Poppins","Sans",[4,2,1,2,5,1,1,3,3,3],[3,5,2,3,4],"Perfectly round geometry. Friendly and modern in every headline.","Wide letters eat space, and long paragraphs get tiring fast."],
  ["Manrope","Sans",[2,3,2,4,4,1,0,2,4,4],[4,4,3,4,3],"Semi-condensed and crisp. Fintech dashboards love me.","Clean, but borrows its personality from whatever's around it."],
  ["DM Sans","Sans",[3,3,1,3,4,1,0,2,4,4],[4,4,4,3,3],"Low contrast, open shapes. Calm at every size.","Pleasant, and forgettable by Tuesday."],
  ["Space Grotesk","Sans",[3,2,1,5,2,2,2,3,2,3],[3,5,2,4,5],"Quirky terminals with a dev-tool edge. Recognizable instantly.","The odd details get distracting in long paragraphs."],
  ["Work Sans","Sans",[2,3,1,3,4,2,1,2,3,4],[4,3,4,3,2],"Grotesk roots, optimized for screens. Honest and hard-working.","Does the job, never steals the show."],
  ["Nunito","Sans",[5,1,0,1,5,0,1,2,4,3],[3,4,3,2,4],"Rounded terminals. Soft, approachable, safe for kids.","Way too cuddly for banks, law firms or anything serious."],
  ["Montserrat","Sans",[2,3,2,2,3,2,2,4,2,3],[3,5,2,3,4],"Born from Buenos Aires street signs. Bold caps headlines.","Wide and heavy in body text, and every 2016 landing page used it."],
  ["IBM Plex Sans","Sans",[1,5,1,5,2,2,0,2,3,5],[5,3,4,5,3],"Engineered by IBM. Grotesk rigor with a human touch.","Corporate. Smells like enterprise software."],
  ["Plus Jakarta Sans","Sans",[3,3,2,3,4,1,0,3,3,4],[4,4,3,3,4],"Modern geometric with a little warmth. Startup-ready.","Looks like a hundred other startup homepages."],
  ["Outfit","Sans",[4,2,2,2,4,1,1,3,3,3],[3,5,2,3,4],"Geometric, clean, a touch of fashion. Great in big sizes.","Gets vague and samey at small UI sizes."],
  ["Playfair Display","Serif",[1,3,5,0,2,5,2,4,2,3],[1,5,1,2,4],"High contrast, made for magazine covers. Luxury in one glance.","Hairline strokes vanish below 16px. Useless in UI."],
  ["Merriweather","Serif",[1,4,2,1,3,4,1,2,4,4],[2,3,5,3,2],"Sturdy slabs and a big x-height. Built for reading on screens.","Heavy and a bit old-fashioned in headlines."],
  ["Lora","Serif",[2,3,3,0,4,4,1,2,4,4],[2,4,5,3,3],"Calligraphic roots. Warm, bookish, very readable.","Too literary for dashboards or dev tools."],
  ["Fraunces","Serif",[4,2,4,0,4,4,4,4,2,2],[1,5,3,2,5],"A soft serif with wonky charm. Retro and premium at once.","Its quirky optical sizes look odd when set wrong."],
  ["Source Serif 4","Serif",[1,5,2,2,3,4,0,2,4,5],[3,3,5,4,2],"Adobe's workhorse serif. Serious and clear on screens.","Competent, but nobody falls in love with it."],
  ["Cormorant Garamond","Serif",[1,3,5,0,2,4,3,1,4,3],[1,4,2,1,4],"An elegant Garamond display cut. Feels like perfume and fashion.","Tiny x-height and thin strokes. Reading it at 14px hurts."],
  ["DM Serif Display","Serif",[2,3,4,0,3,4,3,4,2,3],[1,5,1,2,4],"Chunky contrast and confidence. Headlines with presence.","Display only. Body text in it is a mistake."],
  ["Libre Baskerville","Serif",[1,5,3,0,2,4,2,2,4,5],[2,3,4,3,3],"Classic Baskerville, the face of trust in print.","Wide and old-school, and it never fits on mobile."],
  ["JetBrains Mono","Mono",[1,3,0,5,2,0,1,2,3,3],[3,2,2,5,3],"Coders' favorite. 0/O and 1/l/I are impossible to confuse.","Monospace paragraphs read like a terminal log."],
  ["Space Mono","Mono",[3,1,0,5,2,1,4,3,2,2],[2,4,1,4,4],"Retro-futurist mono with real attitude in headlines.","Wide and loud. It wears out the eye in long text."],
  ["IBM Plex Mono","Mono",[1,4,0,5,2,1,1,2,3,4],[3,2,2,5,3],"Monospace with manners. Data looks precise and calm.","It's a tool font. It won't make anyone feel anything."],
  ["Bebas Neue","Display",[2,2,1,2,1,3,3,5,1,2],[1,5,0,3,4],"All caps, condensed, built for posters and stadiums.","No lowercase at all. A sentence in me is a scream."],
  ["Oswald","Display",[1,3,1,2,2,3,2,5,2,3],[2,5,1,4,3],"Condensed gothic. Fits big words into tight spaces.","Cramped and shouty below headline sizes."],
  ["Abril Fatface","Display",[2,2,4,0,2,5,4,5,1,2],[0,5,0,1,4],"Fat-face drama straight out of a Victorian poster.","Unreadable at small sizes. Strictly decorative."],
  ["Syne","Display",[4,1,3,3,2,3,1,4,1,1],[1,5,1,2,5],"Art-gallery weirdness that widens as it gets bolder.","It confuses people who just need to read the menu."],
  ["Caveat","Hand",[5,0,0,0,5,0,2,1,3,1],[1,3,1,1,3],"Real handwriting. Personal and human, like a sticky note.","Unprofessional anywhere money or data is involved."],
  ["Pacifico","Hand",[5,0,1,0,4,0,5,3,2,1],[0,4,0,0,4],"Surf-shop retro script. Pure vibes.","Illegible below 24px, and it looks like a 2012 food truck."],
];

/* ---------- The whole Google Fonts catalog ---------- */
export const CATALOG = GOOGLE_FONTS;
type Meta = Pick<Font, "weights" | "pop" | "flags" | "thick" | "width"> & { kind: Kind };
const META = new Map<string, Meta>(CATALOG.map(([name, kind, flags, thick, width, pop, w]) => [name, { kind, flags, thick, width, pop, weights: [...w].map(d => +d * 100) }]));

/** The 29 hand-scored fonts. Recommendations and pairings come from here. */
export const FONTS: Font[] = ROWS.map(([name, cat, t, u, pro, con]) => {
  const m = META.get(name);
  return {
    name, cat, pro, con, curated: true,
    tone: Object.fromEntries(TONES.map((k, i) => [k, t[i]])) as Record<Tone, number>,
    use: { ui: u[0], head: u[1], read: u[2], num: u[3], brand: u[4] },
    weights: m?.weights ?? [400, 700], pop: m?.pop ?? 999, flags: m?.flags ?? "", thick: m?.thick ?? 0, width: m?.width ?? 0,
  };
});

export const FALLBACK: Record<Kind, string> = { Sans: "system-ui, sans-serif", Serif: "Georgia, serif", Mono: "ui-monospace, monospace", Display: "Impact, sans-serif", Hand: "cursive" };
export const KIND_LABEL: Record<Kind, string> = { Sans: "Sans serif", Serif: "Serif", Mono: "Monospace", Display: "Display", Hand: "Handwriting" };
export const KINDS = Object.keys(FALLBACK) as Kind[];

// Average hand-set scores per category: the starting point for every font nobody has scored by hand.
const CAT_AVG = Object.fromEntries(KINDS.map(cat => {
  const fs = FONTS.filter(f => f.cat === cat), avg = (get: (f: Font) => number) => Math.round(fs.reduce((s, f) => s + get(f), 0) / fs.length);
  return [cat, {
    tone: Object.fromEntries(TONES.map(k => [k, avg(f => f.tone[k])])) as Record<Tone, number>,
    use: Object.fromEntries(USE_KEYS.map(k => [k, avg(f => f.use[k])])) as Record<Use, number>,
  }];
})) as Record<Kind, Pick<Font, "tone" | "use">>;

const PRO_USE: Record<Use, string> = { ui: "Clear and steady at small sizes. Interfaces like me.", head: "I have presence at big sizes. Headlines get noticed.", read: "Comfortable over long paragraphs. Eyes stay relaxed.", num: "My figures are clean and easy to tell apart.", brand: "Distinctive enough to become your wordmark." };
const CON_USE: Record<Use, string> = { ui: "Gets muddy at small UI sizes.", head: "Too quiet for a hero headline.", read: "Tiring over long paragraphs.", num: "Numbers and look-alike letters blur together.", brand: "Too generic to ever become a brand." };
const clamp5 = (v: number) => Math.max(0, Math.min(5, Math.round(v)));

/** Scores for any Google font, estimated from its real metadata: category, stroke thickness, width, popularity, weight range. */
export function estimate(name: string): Font | null {
  const m = META.get(name);
  if (!m) return null;
  const t = { ...CAT_AVG[m.kind].tone }, u = { ...CAT_AVG[m.kind].use };
  if (m.pop <= 40) t.trustworthy += 1;
  if (m.pop > 600) { t.trustworthy -= 1; t.retro += 1; }
  if (m.weights.length <= 2) u.ui -= 1;
  if (m.weights.length === 1) u.read -= 1;
  if (m.thick >= 7) { t.bold += 2; u.head += 1; u.read -= 1; t.calm -= 1; }
  if (m.thick && m.thick <= 3) { t.luxury += 1; t.calm += 1; u.ui -= 1; t.bold -= 2; }
  if (m.width >= 8) { t.friendly += 1; u.read -= 1; }
  if (m.width && m.width <= 4) { t.bold += 1; u.head += 1; u.ui -= 1; u.read -= 1; }
  if (m.flags.includes("d")) { u.head += 1; u.brand += 1; u.read -= 2; u.ui -= 1; }
  if (m.flags.includes("s")) { t.technical += 1; t.trustworthy += 1; t.retro += 1; }
  for (const k of TONES) t[k] = clamp5(t[k]);
  for (const k of USE_KEYS) u[k] = clamp5(u[k]);
  const best = USE_KEYS.reduce((a, b) => (u[b] > u[a] ? b : a)), worst = USE_KEYS.reduce((a, b) => (u[b] < u[a] ? b : a));
  const { kind, ...meta } = m;
  return { name, cat: kind, ...meta, tone: t, use: u, estimated: true, pro: PRO_USE[best], con: CON_USE[worst] };
}

const fontCache = new Map<string, Font | null>(FONTS.map(f => [f.name, f]));
export function fontByName(name: string): Font | null {
  if (!fontCache.has(name)) fontCache.set(name, estimate(name));
  return fontCache.get(name) ?? null;
}
export const allFontNames = (): string[] => CATALOG.map(r => r[0]);
/** Every font in the catalog, scored. */
export const allFonts = (): Font[] => allFontNames().map(fontByName).filter((f): f is Font => f !== null);

/** Google Fonts rejects the whole request if a weight doesn't exist, so only ask for weights the family ships. */
export function gfFamily(f: Pick<Font, "name" | "weights">): string {
  const have = f.weights.length ? f.weights : [400];
  let want = [400, 700].filter(w => have.includes(w));
  if (!want.length) want = [have.reduce((a, b) => (Math.abs(b - 400) < Math.abs(a - 400) ? b : a))];
  const family = "family=" + f.name.replace(/ /g, "+");
  return want.length === 1 && want[0] === 400 ? family : family + ":wght@" + want.join(";");
}

export function detectTones(text: string): Tone[] {
  const t = " " + text.toLowerCase().replace(/[^a-z0-9 ]/g, " ") + " ";
  return TONES.filter(k => KEYWORDS[k].split(" ").some(w => t.includes(" " + w + " ")));
}

type Scored = Pick<Font, "tone" | "use">;
export const score = (f: Scored, c: Criterion): number => (c.kind === "tone" ? f.tone[c.key] : f.use[c.key]);
export const fit = (f: Scored, criteria: Criterion[]): number => criteria.reduce((s, c) => s + score(f, c) * (c.kind === "tone" ? 2 : 1.5), 0);

// Estimated scores are guesses, so they are discounted wherever fonts are compared for recommendation.
const ESTIMATE_DISCOUNT = 0.85;
const confidence = (f: Pick<Font, "estimated">) => (f.estimated ? ESTIMATE_DISCOUNT : 1);
const maxFit = (criteria: Criterion[]) => criteria.reduce((s, c) => s + 5 * (c.kind === "tone" ? 2 : 1.5), 0);
/** Confidence-adjusted fit to the brief, 0 to 100. */
export const fitPct = (f: Font, criteria: Criterion[]): number => Math.round((100 * fit(f, criteria) * confidence(f)) / Math.max(1, maxFit(criteria)));

// Recommendation pool: the hand-scored fonts plus the 300 most-used Google fonts (estimated).
const POOL_RANK = 300;
function recommendPool(): Font[] {
  const curated = new Set(FONTS.map(f => f.name));
  return [...FONTS, ...CATALOG.filter(r => r[5] <= POOL_RANK && !curated.has(r[0])).map(r => fontByName(r[0])).filter((f): f is Font => f !== null)];
}
/** Ranks by confidence-adjusted fit; ties go to the more popular font. */
export function rankFonts(criteria: Criterion[], pool: Font[] = recommendPool()): Font[] {
  const rank = (f: Font) => fit(f, criteria) * confidence(f);
  return pool.slice().sort((a, b) => rank(b) - rank(a) || a.pop - b.pop);
}
/** Best overall, then the best from a different category, then the best remaining. A real contest, but every pick is plausible. */
export function pickContenders(criteria: Criterion[]): Font[] {
  const ranked = rankFonts(criteria), first = ranked[0];
  const second = ranked.find(f => f.cat !== first.cat) ?? ranked[1];
  const third = ranked.find(f => f !== first && f !== second)!;
  return [first, second, third];
}

export interface RoundResult<T extends Contender> { leaders: T[]; hits: { f: T; dmg: number }[]; best: number }
/** Each round the leader on that criterion hits everyone else by the size of the gap. Mutates hp. */
export function playRound<T extends Contender>(fighters: T[], crit: Criterion): RoundResult<T> {
  const alive = fighters.filter(f => f.hp > 0);
  const best = Math.max(...alive.map(f => score(f, crit)));
  const leaders = alive.filter(f => score(f, crit) === best);
  const hits = alive.filter(f => score(f, crit) < best).map(f => {
    const dmg = (best - score(f, crit)) * 12 + 4;
    f.hp = Math.max(0, f.hp - dmg);
    return { f, dmg };
  });
  return { leaders, hits, best };
}
export const winnerOf = <T extends Contender>(fighters: T[], criteria: Criterion[]): T =>
  fighters.slice().sort((a, b) => b.hp - a.hp || fit(b, criteria) - fit(a, criteria))[0];
export function runAll(criteria: Criterion[], contenders: Font[] = pickContenders(criteria)) {
  const fighters: Contender[] = contenders.map(f => ({ ...f, hp: 100 }));
  criteria.forEach(c => playRound(fighters, c));
  return { fighters, winner: winnerOf(fighters, criteria) };
}

/* ---------- Pairing ---------- */
export interface Pairing { font: Font; role: "heading" | "body"; heading: Font; body: Font; why: string; score: number }
/** Why two fonts work together, by their categories (heading over body). */
function pairWhy(h: Font, b: Font): string {
  if (h.cat === "Serif" && b.cat === "Sans") return "Serif headlines over a sans body. The classic editorial contrast.";
  if (h.cat === "Sans" && b.cat === "Serif") return "Clean sans headlines over a bookish serif body.";
  if (h.cat === "Display") return "A loud display face up top, a calm reader underneath.";
  if (h.cat === "Mono") return "Monospace headlines add a technical edge while the body stays easy to read.";
  if (h.cat === "Hand") return "A handwritten touch in the headlines, kept legible below.";
  if (h.cat === b.cat) return "Same family of shapes, so keep sizes and weights far apart to tell them apart.";
  return "Different shapes for different jobs: one to be noticed, one to be read.";
}
/** Ranked partners for any font. A strong reader becomes the body and gets heading partners; anything else leads and gets a body partner. */
export function pairingsFor(font: Font, criteria: Criterion[], n = 3): Pairing[] {
  const tones = criteria.filter(c => c.kind === "tone");
  const isBody = font.use.read >= 4 || (font.use.ui >= 4 && font.use.read >= 3);
  const scored = FONTS.filter(f => f.name !== font.name).flatMap((f): Pairing[] => {
    const heading = isBody ? f : font, body = isBody ? font : f;
    const strength = isBody ? f.use.head : (f.use.read + f.use.ui) / 2;
    if (strength < (isBody ? 4 : 3.5)) return [];
    return [{ font: f, role: isBody ? "heading" : "body", heading, body, why: pairWhy(heading, body), score: strength * 2 + (heading.cat !== body.cat ? 3 : 0) + fit(f, tones) * 0.6 }];
  }).sort((a, b) => b.score - a.score || a.font.pop - b.font.pop);
  const out: Pairing[] = []; // one per category first, for real variety
  for (const p of scored) if (out.length < n && !out.some(o => o.font.cat === p.font.cat)) out.push(p);
  for (const p of scored) if (out.length < n && !out.includes(p)) out.push(p);
  return out;
}
/** Does this font need a partner for the body-text jobs in the brief? */
export const needsPartner = (font: Font, criteria: Criterion[]): boolean => criteria.some(c => (c.key === "read" || c.key === "ui") && font.use[c.key] < 3);

/** Copy-paste CSS. With a body font, the first font is used for headings only. */
export function cssFor(heading: Font, body: Font | null): string {
  const url = "https://fonts.googleapis.com/css2?" + [heading, body].filter((f): f is Font => f !== null).map(gfFamily).join("&") + "&display=swap";
  let css = `@import url('${url}');\n\n`;
  if (body) css += `h1, h2, h3, .brand {\n  font-family: '${heading.name}', ${FALLBACK[heading.cat]};\n}\nbody {\n  font-family: '${body.name}', ${FALLBACK[body.cat]};\n}`;
  else css += `body {\n  font-family: '${heading.name}', ${FALLBACK[heading.cat]};\n}`;
  return css;
}

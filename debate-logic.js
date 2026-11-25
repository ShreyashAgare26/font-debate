// Shared by brief.html (2D) and debate3d.html (3D). Pure data and scoring, no DOM, Node-testable.
const TONES = ["playful","serious","luxury","technical","friendly","editorial","retro","bold","calm","trustworthy"];
const USES = { ui: "App / UI", head: "Headlines", read: "Long reading", num: "Numbers & data", brand: "Logo / brand" };
const KEYWORDS = {
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
const FONTS = [
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
].map(([name, cat, t, u, pro, con]) => ({ name, cat, pro, con, curated: true,
  tone: Object.fromEntries(TONES.map((k, i) => [k, t[i]])),
  use: { ui: u[0], head: u[1], read: u[2], num: u[3], brand: u[4] } }));

const FALLBACK = { Sans: "system-ui, sans-serif", Serif: "Georgia, serif", Mono: "ui-monospace, monospace", Display: "Impact, sans-serif", Hand: "cursive" };
const KIND_LABEL = { Sans: "Sans serif", Serif: "Serif", Mono: "Monospace", Display: "Display", Hand: "Handwriting" };

/* ---------- The whole Google Fonts catalog ---------- */
const CATALOG = typeof GOOGLE_FONTS !== "undefined" ? GOOGLE_FONTS : (typeof require !== "undefined" ? require("./google-fonts.js") : []);
const META = new Map(CATALOG.map(([name, kind, flags, thick, width, pop, w]) => [name, { kind, flags, thick, width, pop, weights: [...w].map(d => +d * 100) }]));
FONTS.forEach(f => Object.assign(f, META.get(f.name) || { weights: [400, 700], pop: 999, flags: "", thick: 0, width: 0 }));

// Average hand-set scores per category: the starting point for every font nobody has scored by hand.
const CAT_AVG = {};
for (const cat of Object.keys(FALLBACK)) {
  const fs = FONTS.filter(f => f.cat === cat), avg = get => Math.round(fs.reduce((s, f) => s + get(f), 0) / fs.length);
  CAT_AVG[cat] = { tone: Object.fromEntries(TONES.map(k => [k, avg(f => f.tone[k])])), use: Object.fromEntries(Object.keys(USES).map(k => [k, avg(f => f.use[k])])) };
}
const PRO_USE = { ui: "Clear and steady at small sizes. Interfaces like me.", head: "I have presence at big sizes. Headlines get noticed.", read: "Comfortable over long paragraphs. Eyes stay relaxed.", num: "My figures are clean and easy to tell apart.", brand: "Distinctive enough to become your wordmark." };
const CON_USE = { ui: "Gets muddy at small UI sizes.", head: "Too quiet for a hero headline.", read: "Tiring over long paragraphs.", num: "Numbers and look-alike letters blur together.", brand: "Too generic to ever become a brand." };
const clamp5 = v => Math.max(0, Math.min(5, Math.round(v)));

// Scores for any Google font, estimated from its real metadata: category, stroke thickness, width, popularity, weight range.
function estimate(name) {
  const m = META.get(name); if (!m) return null;
  const base = CAT_AVG[m.kind], t = { ...base.tone }, u = { ...base.use };
  const add = (obj, k, v) => obj[k] += v;
  if (m.pop <= 40) { add(t, "trustworthy", 1); }
  if (m.pop > 600) { add(t, "trustworthy", -1); add(t, "retro", 1); }
  if (m.weights.length <= 2) { add(u, "ui", -1); }
  if (m.weights.length === 1) { add(u, "read", -1); }
  if (m.thick >= 7) { add(t, "bold", 2); add(u, "head", 1); add(u, "read", -1); add(t, "calm", -1); }
  if (m.thick && m.thick <= 3) { add(t, "luxury", 1); add(t, "calm", 1); add(u, "ui", -1); add(t, "bold", -2); }
  if (m.width >= 8) { add(t, "friendly", 1); add(u, "read", -1); }
  if (m.width && m.width <= 4) { add(t, "bold", 1); add(u, "head", 1); add(u, "ui", -1); add(u, "read", -1); }
  if (m.flags.includes("d")) { add(u, "head", 1); add(u, "brand", 1); add(u, "read", -2); add(u, "ui", -1); }
  if (m.flags.includes("s")) { add(t, "technical", 1); add(t, "trustworthy", 1); add(t, "retro", 1); }
  for (const k in t) t[k] = clamp5(t[k]); for (const k in u) u[k] = clamp5(u[k]);
  const uses = Object.keys(u), best = uses.reduce((a, b) => u[b] > u[a] ? b : a), worst = uses.reduce((a, b) => u[b] < u[a] ? b : a);
  return { name, cat: m.kind, ...m, tone: t, use: u, estimated: true, pro: PRO_USE[best], con: CON_USE[worst] };
}
const fontCache = new Map(FONTS.map(f => [f.name, f]));
function fontByName(name) { if (!fontCache.has(name)) fontCache.set(name, estimate(name)); return fontCache.get(name); }
const allFontNames = () => CATALOG.map(r => r[0]);

// Google Fonts rejects the whole request if a weight doesn't exist, so only ask for weights the family ships.
function gfFamily(f) {
  const have = f.weights && f.weights.length ? f.weights : [400];
  let want = [400, 700].filter(w => have.includes(w));
  if (!want.length) want = [have.reduce((a, b) => Math.abs(b - 400) < Math.abs(a - 400) ? b : a)];
  const fam = "family=" + f.name.replace(/ /g, "+");
  return want.length === 1 && want[0] === 400 ? fam : fam + ":wght@" + want.join(";");
}

function detectTones(text) {
  const t = " " + text.toLowerCase().replace(/[^a-z0-9 ]/g, " ") + " ";
  return TONES.filter(k => KEYWORDS[k].split(" ").some(w => t.includes(" " + w + " ")));
}
// criteria: [{kind:"tone"|"use", key}]
function score(f, crit) { return crit.kind === "tone" ? f.tone[crit.key] : f.use[crit.key]; }
function fit(f, criteria) { return criteria.reduce((s, c) => s + score(f, c) * (c.kind === "tone" ? 2 : 1.5), 0); }
// Confidence-adjusted: estimated fonts are discounted, same as when ranking.
const fitPct = (f, criteria) => Math.round(100 * fit(f, criteria) * (f.estimated ? ESTIMATE_DISCOUNT : 1) / Math.max(1, fit({ tone: new Proxy({}, { get: () => 5 }), use: new Proxy({}, { get: () => 5 }) }, criteria)));

// Recommendation pool: the hand-scored fonts plus the 300 most-used Google fonts (estimated).
const POOL_RANK = 300;
function recommendPool() { const curated = new Set(FONTS.map(f => f.name)); return [...FONTS, ...CATALOG.filter(r => r[5] <= POOL_RANK && !curated.has(r[0])).map(r => fontByName(r[0]))]; }
// Ranks by fit. Estimated scores are guesses, so they need a clear margin to beat a hand-scored font; ties go to the more popular font.
const ESTIMATE_DISCOUNT = 0.85;
const rankFit = (f, criteria) => fit(f, criteria) * (f.estimated ? ESTIMATE_DISCOUNT : 1);
function rankFonts(criteria, pool = recommendPool()) {
  return pool.slice().sort((a, b) => rankFit(b, criteria) - rankFit(a, criteria) || a.pop - b.pop);
}
// Best overall, then the best from a different category, then the best remaining. A real contest, but every pick is plausible.
function pickContenders(criteria) {
  const ranked = rankFonts(criteria);
  const picks = [ranked[0]];
  picks.push(ranked.find(f => f.cat !== picks[0].cat) || ranked[1]);
  picks.push(ranked.find(f => !picks.includes(f)));
  return picks;
}

// Each round the leader on that criterion hits everyone else by the size of the gap.
function playRound(fighters, crit) {
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

function runAll(criteria, contenders = pickContenders(criteria)) {
  const fighters = contenders.map(f => ({ ...f, hp: 100 }));
  criteria.forEach(c => playRound(fighters, c));
  return { fighters, winner: winnerOf(fighters, criteria) };
}
function winnerOf(fighters, criteria) {
  return fighters.slice().sort((a, b) => b.hp - a.hp || fit(b, criteria) - fit(a, criteria))[0];
}

// Only for the body-text jobs the winner is weak at; the partner is ranked on those jobs first, vibe second.
function pairingFor(winner, criteria) {
  const weak = criteria.filter(c => (c.key === "read" || c.key === "ui") && winner.use[c.key] < 3);
  if (!weak.length) return null;
  const tones = criteria.filter(c => c.kind === "tone");
  const rank = f => weak.reduce((s, c) => s + f.use[c.key] * 4, 0) + fit(f, tones);
  return FONTS.filter(f => f.name !== winner.name && weak.every(c => f.use[c.key] >= 4))
    .sort((a, b) => rank(b) - rank(a))[0] || null;
}

// Why two fonts work together, by their categories (heading over body).
function pairWhy(h, b) {
  if (h.cat === "Serif" && b.cat === "Sans") return "Serif headlines over a sans body. The classic editorial contrast.";
  if (h.cat === "Sans" && b.cat === "Serif") return "Clean sans headlines over a bookish serif body.";
  if (h.cat === "Display") return "A loud display face up top, a calm reader underneath.";
  if (h.cat === "Mono") return "Monospace headlines add a technical edge while the body stays easy to read.";
  if (h.cat === "Hand") return "A handwritten touch in the headlines, kept legible below.";
  if (h.cat === b.cat) return "Same family of shapes, so keep sizes and weights far apart to tell them apart.";
  return "Different shapes for different jobs: one to be noticed, one to be read.";
}
// Ranked partners for any font. A strong reader becomes the body and gets heading partners; anything else leads and gets a body partner.
function pairingsFor(font, criteria, n = 3) {
  const tones = criteria.filter(c => c.kind === "tone");
  const isBody = font.use.read >= 4 || (font.use.ui >= 4 && font.use.read >= 3);
  const scored = FONTS.filter(f => f.name !== font.name).map(f => {
    const heading = isBody ? f : font, body = isBody ? font : f;
    const strength = isBody ? f.use.head : (f.use.read + f.use.ui) / 2;
    if (strength < (isBody ? 4 : 3.5)) return null;
    return { font: f, role: isBody ? "heading" : "body", heading, body, why: pairWhy(heading, body),
      score: strength * 2 + (heading.cat !== body.cat ? 3 : 0) + fit(f, tones) * 0.6 };
  }).filter(Boolean).sort((a, b) => b.score - a.score || a.font.pop - b.font.pop);
  const out = []; // one per category first, for real variety
  for (const p of scored) if (out.length < n && !out.some(o => o.font.cat === p.font.cat)) out.push(p);
  for (const p of scored) if (out.length < n && !out.includes(p)) out.push(p);
  return out;
}
// Does this font need a partner for the jobs in the brief?
const needsPartner = (font, criteria) => criteria.some(c => (c.key === "read" || c.key === "ui") && font.use[c.key] < 3);

function cssFor(winner, pair) {
  const fams = [winner, pair].filter(Boolean).map(gfFamily).join("&");
  const url = "https://fonts.googleapis.com/css2?" + fams + "&display=swap";
  let css = `@import url('${url}');\n\n`;
  if (pair) css += `h1, h2, h3, .brand {\n  font-family: '${winner.name}', ${FALLBACK[winner.cat]};\n}\nbody {\n  font-family: '${pair.name}', ${FALLBACK[pair.cat]};\n}`;
  else css += `body {\n  font-family: '${winner.name}', ${FALLBACK[winner.cat]};\n}`;
  return css;
}
if (typeof module !== 'undefined') module.exports = { TONES, USES, FONTS, FALLBACK, KIND_LABEL, CATALOG, detectTones, score, fit, fitPct, estimate, fontByName, allFontNames, rankFonts, pickContenders, playRound, runAll, winnerOf, pairingFor, pairingsFor, needsPartner, cssFor, gfFamily };

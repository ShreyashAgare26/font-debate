process.chdir(__dirname);
const L = require("./debate-logic.js");
const { FONTS, CATALOG, detectTones, fit, fitPct, estimate, fontByName, pickContenders, runAll, pairingFor, cssFor, gfFamily } = L;
const assert = require("assert");
const C = (tones, uses) => [...tones.map(key => ({kind:"tone",key})), ...uses.map(key => ({kind:"use",key}))];
assert.ok(CATALOG.length > 1500);
assert.ok(FONTS.every(f => f.weights.length), "curated fonts got metadata");
assert.strictEqual(gfFamily(fontByName("Bebas Neue")), "family=Bebas+Neue");
assert.strictEqual(gfFamily(fontByName("Inter")), "family=Inter:wght@400;700");
const lobster = estimate("Lobster"); assert.ok(lobster && lobster.estimated && lobster.cat === "Display", JSON.stringify(lobster));
assert.ok(fontByName("Not A Font") === null);
const lux = runAll(C(["luxury","editorial"], ["head","brand"]));
console.log("lux", lux.fighters.map(f=>f.name+(f.estimated?"*":"")).join(", "), "=>", lux.winner.name);
assert.strictEqual(lux.winner.cat, "Serif");
for (const [t,u] of [[["technical","calm"],["ui","num"]],[["playful","friendly"],["ui","head"]],[["trustworthy","friendly","playful"],["ui","head","num"]],[["bold","retro"],["brand"]],[["serious","trustworthy"],["read"]]]) {
  const c = C(t,u), r = runAll(c); console.log(t.join("+"), u.join("+"), "=>", r.fighters.map(f=>`${f.name}${f.estimated?"*":""}:${f.hp}(${fitPct(f,c)}%)`).join("  "), "| WIN", r.winner.name);
}
const mine = runAll(C(["friendly"],["ui"]), ["Comic Neue","Inter","Lobster"].map(fontByName));
console.log("custom lineup winner", mine.winner.name);
assert.ok(fitPct(fontByName("Inter"), C(["trustworthy"],["ui"])) > 80);
console.log("ok");
// pairings
{
  const { pairingsFor, needsPartner } = L;
  const c1 = C(["luxury"], ["head", "read"]), play = fontByName("Playfair Display"), ps = pairingsFor(play, c1);
  assert.ok(ps.length === 3 && ps.every(p => p.role === "body" && p.font.use.read >= 3), "display serif gets body partners");
  assert.ok(needsPartner(play, c1));
  const inter = fontByName("Inter"), pi = pairingsFor(inter, C(["technical"], ["ui"]));
  assert.ok(pi.length === 3 && pi.every(p => p.role === "heading" && p.heading === p.font && p.body === inter), "a reader becomes the body");
  assert.ok(new Set(pi.map(p => p.font.cat)).size >= 2, "variety across categories");
  assert.ok(!needsPartner(inter, C(["technical"], ["ui"])));
  assert.ok(pairingsFor(fontByName("Lobster"), c1).length > 0, "works for estimated fonts too");
  console.log("pairs Playfair:", ps.map(p => p.font.name).join(", "), "| Inter:", pi.map(p => p.font.name).join(", "));
}
console.log("ok");

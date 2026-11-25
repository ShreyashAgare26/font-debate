import { describe, expect, it } from "vitest";
import { CATALOG, FONTS, cssFor, detectTones, estimate, fitPct, fontByName, gfFamily, needsPartner, pairingsFor, pickContenders, runAll, type Criterion, type Tone, type Use } from "./logic";

const C = (tones: Tone[], uses: Use[]): Criterion[] => [...tones.map(key => ({ kind: "tone" as const, key })), ...uses.map(key => ({ kind: "use" as const, key }))];
const font = (name: string) => { const f = fontByName(name); if (!f) throw new Error("no font " + name); return f; };

describe("catalog", () => {
  it("has the whole Google Fonts list and metadata for the hand-scored fonts", () => {
    expect(CATALOG.length).toBeGreaterThan(1500);
    expect(FONTS.every(f => f.weights.length > 0)).toBe(true);
  });
  it("only requests weights a family ships", () => {
    expect(gfFamily(font("Bebas Neue"))).toBe("family=Bebas+Neue");
    expect(gfFamily(font("Inter"))).toBe("family=Inter:wght@400;700");
    expect(cssFor(font("Bebas Neue"), null)).not.toContain("Bebas+Neue:wght");
  });
  it("estimates scores for fonts nobody scored by hand", () => {
    const lobster = estimate("Lobster");
    expect(lobster?.estimated).toBe(true);
    expect(lobster?.cat).toBe("Display");
    expect(fontByName("Not A Font")).toBeNull();
  });
});

describe("brief", () => {
  it("reads personality from the description", () => {
    expect(detectTones("A luxury perfume boutique")).toEqual(["luxury"]);
    expect(detectTones("fintech app for students")).toContain("trustworthy");
  });
  it("books three different, plausible contenders", () => {
    const picks = pickContenders(C(["friendly"], ["ui"]));
    expect(new Set(picks.map(f => f.name)).size).toBe(3);
    expect(new Set(picks.map(f => f.cat)).size).toBeGreaterThanOrEqual(2);
    expect(fitPct(font("Inter"), C(["trustworthy"], ["ui"]))).toBeGreaterThan(80);
  });
});

describe("debate", () => {
  it("gives a luxury editorial brief to a serif", () => {
    expect(runAll(C(["luxury", "editorial"], ["head", "brand"])).winner.cat).toBe("Serif");
  });
  it("gives a developer tool to a sans or mono", () => {
    expect(["Sans", "Mono"]).toContain(runAll(C(["technical"], ["ui", "num"])).winner.cat);
  });
  it("judges a lineup the user picked themselves", () => {
    expect(runAll(C(["friendly"], ["ui"]), ["Comic Neue", "Inter", "Lobster"].map(font)).winner.name).toBe("Inter");
  });
});

describe("pairing", () => {
  it("gives a display serif body-text partners", () => {
    const c = C(["luxury"], ["head", "read"]), playfair = font("Playfair Display"), pairs = pairingsFor(playfair, c);
    expect(pairs).toHaveLength(3);
    expect(pairs.every(p => p.role === "body" && p.font.use.read >= 3)).toBe(true);
    expect(needsPartner(playfair, c)).toBe(true);
  });
  it("makes a strong reader the body and offers heading partners across categories", () => {
    const c = C(["technical"], ["ui"]), inter = font("Inter"), pairs = pairingsFor(inter, c);
    expect(pairs.every(p => p.role === "heading" && p.body === inter)).toBe(true);
    expect(new Set(pairs.map(p => p.font.cat)).size).toBeGreaterThanOrEqual(2);
    expect(needsPartner(inter, c)).toBe(false);
  });
  it("works for estimated fonts too", () => {
    expect(pairingsFor(font("Lobster"), C(["luxury"], ["head", "read"])).length).toBeGreaterThan(0);
  });
});

// The verdict: why the winner won, the scorecard, the user's final call, font pairing and the CSS to copy.
import * as THREE from "three";
import { app, match, showScreen } from "./app";
import { setJumbo } from "./arena";
import { sfx, voice } from "./audio";
import { camIdle } from "./camera";
import { CENTER, PODIUM_TOP, buildCharacter, setMood, stage, type Fighter } from "./characters";
import { loadFonts } from "./fonts";
import { enterLineup, floaters, openPicker } from "./lineup";
import { USES, cssFor, needsPartner, pairingsFor, score, type Font, type Pairing } from "./logic";
import { canvas } from "./scene";
import { gtween } from "./time";
import { $, easeOut, el, fam } from "./util";

const isFighter = (f: Font): f is Fighter => "color" in f;

export function showVerdict(): void {
  const m = match(), w = m.winner!;
  showScreen("verdict");
  $("vFor").textContent = m.name;
  const top = m.criteria.slice().sort((a, b) => score(w, b) - score(w, a)).slice(0, 3);
  const why = $("vWhy"); why.innerHTML = "";
  for (const text of [w.pro, ...top.map(c => `${c.kind === "use" ? USES[c.key] : "Feels " + c.key}: ${score(w, c)}/5`), `Watch out: ${w.con}`]) why.append(el("li", null, text));

  // Scorecard: one row per round, five pips per font
  const table = $("vScore"); table.innerHTML = "";
  const head = el("tr"); head.append(el("th", null, "Test"));
  for (const f of m.fighters) { const th = el("th", "f", f.name); th.style.fontFamily = fam(f); th.style.color = f.color; th.scope = "col"; head.append(th); }
  table.append(head);
  for (const c of m.criteria) {
    const tr = el("tr"); tr.append(el("td", null, c.kind === "use" ? USES[c.key] : c.key[0].toUpperCase() + c.key.slice(1)));
    const best = Math.max(...m.fighters.map(f => score(f, c)));
    for (const f of m.fighters) {
      const s = score(f, c), td = el("td", s === best ? "best" : ""), pips = el("span", "pips");
      for (let k = 0; k < 5; k++) pips.append(el("i", k < s ? "on" : ""));
      td.style.setProperty("--acc", f.color); td.title = `${s} / 5`; td.setAttribute("aria-label", `${f.name}: ${s} out of 5`);
      td.append(pips); tr.append(td);
    }
    table.append(tr);
  }
  const hpRow = el("tr"); hpRow.append(el("td", null, "Final HP"));
  for (const f of m.fighters) hpRow.append(el("td", "hpcell" + (f.hp > 0 ? "" : " out"), f.hp > 0 ? String(f.hp) : "K.O."));
  table.append(hpRow);

  // Your call: the arena's pick first, then the others by HP, then any Google font
  const picks = $("vPick"); picks.innerHTML = "";
  for (const f of m.fighters.slice().sort((a, b) => Number(b === w) - Number(a === w) || b.hp - a.hp)) {
    const b = el("button"); b.type = "button"; b.dataset.name = f.name;
    const name = el("span", null, f.name); name.style.fontFamily = fam(f);
    b.append(name, el("small", null, f === w ? "Arena's pick" : f.hp > 0 ? `${f.hp} HP` : "Knocked out")); b.onclick = () => setFinal(f);
    picks.append(b);
  }
  const other = el("button"); other.type = "button";
  other.append(el("span", null, "Another font…"), el("small", null, "any Google font"));
  other.onclick = () => { m.pickForVerdict = true; openPicker(-1); };
  picks.append(other);

  setFinal(w);
  $("verdict").scrollTop = 0; $("copy").focus({ preventScroll: true });
}

/** Sets the font the user leaves with, and offers partners for it. */
export function setFinal(f: Font): void {
  const m = match(), w = m.winner!;
  m.final = f;
  document.querySelectorAll<HTMLElement>("#vPick button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.name === f.name)));
  const name = $("vName");
  name.textContent = f.name; name.style.fontFamily = fam(f); name.style.color = isFighter(f) ? f.color : "var(--fg)";
  $("vPickNote").textContent = f === w ? "" : `You overruled the arena with ${f.name}. Fair enough, it's your product.`;
  $<HTMLAnchorElement>("vLink").href = "https://fonts.google.com/specimen/" + f.name.replace(/ /g, "+");
  setJumbo(f === w ? "Last one standing" : "Your pick", f.name, `the font for ${m.name}`, fam(f));

  // Pairing: offered for every font, pre-selected only when this one can't carry body text
  m.pairs = pairingsFor(f, m.criteria);
  const box = $("vPairs"); box.innerHTML = "";
  const row = (i: number, label: string, tag: string, font?: Font) => {
    const b = el("button"); b.type = "button"; b.dataset.i = String(i);
    const n = el("span", null, label); if (font) n.style.fontFamily = fam(font);
    b.append(n, el("small", null, tag)); b.onclick = () => setPair(i, true);
    box.append(b);
  };
  row(-1, "On its own", "one font");
  m.pairs.forEach((p, i) => row(i, p.font.name, p.role === "body" ? "for body text" : "for headlines", p.font));
  // Redraw once the partner fonts have loaded, unless the user has moved on
  void loadFonts([...m.fighters, f, ...m.pairs.map(p => p.font)]).then(() => { if (app.match === m && m.final === f) setPair(m.pairIdx, false); });
  setPair(needsPartner(f, m.criteria) && m.pairs.length ? 0 : -1, false);
}

function setPair(i: number, announce: boolean): void {
  const m = match(), f = m.final!, p: Pairing | null = m.pairs[i] ?? null;
  m.pairIdx = p ? i : -1;
  document.querySelectorAll<HTMLElement>("#vPairs button").forEach(b => b.setAttribute("aria-pressed", String(Number(b.dataset.i) === m.pairIdx)));
  const heading = p ? p.heading : f, body = p ? p.body : f;
  const spec = $("vSpec"); spec.innerHTML = "";
  const title = el("b", null, m.name), text = el("span", null, m.desc || "A product people will love using every day.");
  title.style.fontFamily = fam(heading); text.style.fontFamily = fam(body); spec.append(title, text);
  if (p) spec.append(el("small", null, `Headlines in ${heading.name} · Body in ${body.name}`));
  $("vPair").textContent = p ? p.why
    : needsPartner(f, m.criteria) ? `${f.name} is weak at body text. Pick a partner for paragraphs and UI.`
    : `${f.name} can carry everything alone. For more contrast, add a partner.`;
  $("vCss").textContent = p ? cssFor(heading, body) : cssFor(f, null);
  setPartner(p, announce);
}

/** The chosen partner walks on stage next to the winner, as a white guest character. */
function setPartner(p: Pairing | null, announce: boolean): void {
  const m = match();
  if (m.partner) { stage.remove(m.partner.root); m.partner = null; }
  if (!p || app.screen !== "verdict") return;
  // Its voice slot is the one after the winner's, so a partner of the same kind never speaks in the winner's voice
  const ch = buildCharacter({ ...p.font, hp: 100, color: "#f3f5fa", slot: ((m.winner?.slot ?? 0) + 1) % 3, home: CENTER.clone().add(new THREE.Vector3(-3.1, 0, -1.1)) });
  ch.lift.position.y = 0; ch.blob.position.y = 0.03; ch.label.position.y -= PODIUM_TOP; // it stands on the floor, not on a podium
  ch.root.position.copy(ch.home); ch.yaw = ch.homeYaw = 0.3; ch.root.rotation.y = 0.3;
  stage.add(ch.root); m.partner = ch;
  void gtween(480, t => { ch.root.position.y = Math.sin(t * Math.PI) * 1.4; ch.root.scale.setScalar(0.4 + 0.6 * easeOut(t)); });
  if (!announce) return;
  sfx.pop(); setMood(ch, "smug"); ch.talking = true;
  const voiced = voice.on;
  void voice.speak(ch, p.role === "body" ? "Leave the paragraphs to me." : "I'll take the headlines.").then(() => { if (voiced) { ch.talking = false; if (m.partner === ch) setMood(ch, "idle"); } });
  if (!voiced) setTimeout(() => { ch.talking = false; if (m.partner === ch) setMood(ch, "idle"); }, 1400);
}

export function initVerdict(): void {
  const copy = $("copy");
  copy.onclick = async () => {
    try { await navigator.clipboard.writeText($("vCss").textContent ?? ""); copy.textContent = "Copied"; }
    catch { copy.textContent = "Select it above"; }
    setTimeout(() => { copy.textContent = "Copy CSS"; }, 1800);
  };
  $("rematch").onclick = async () => { voice.stop(); canvas.style.filter = ""; await enterLineup(); };
  $("again").onclick = () => {
    voice.stop(); stage.clear(); floaters.length = 0; app.match = null;
    showScreen("brief"); camIdle(); setJumbo("Font Debate", "Who's your font?", "write a brief to start");
    $("name").focus();
  };
}

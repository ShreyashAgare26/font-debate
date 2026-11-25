// The fight HUD: score bug, lower-third dialogue (spoken aloud), scoreboard with per-round samples, coach marks.
import { match } from "./app";
import { sfx, voice } from "./audio";
import type { Fighter } from "./characters";
import type { Use } from "./logic";
import { time, wait } from "./time";
import { $, el, esc, fam, q, store } from "./util";

/** What the scoreboard cards demonstrate: a use from the brief, a personality check, or the opening specimen. */
export type SampleKind = Use | "vibe" | "intro";
function sampleHTML(kind: SampleKind): string {
  const m = match(), n = esc(m.name), d = esc(m.desc || "A product people will love using every day.");
  switch (kind) {
    case "ui": return `<div class="s-ui"><small>Email address</small><div class="in">you@${n.toLowerCase().replace(/\s+/g, "")}.com</div><div class="bt">Continue to ${n}</div></div>`;
    case "head": return `<div class="s-head">${n} makes it simple.</div>`;
    case "read": return `<div class="s-read">${d} ${d}</div>`;
    case "num": return `<div class="s-num">₹1,234,567.89<br>0O Il1 5S 8B<br>+12.5% · #A0O1</div>`;
    case "brand": return `<div class="s-brand">${n}</div>`;
    case "intro": return `<div class="s-intro">Aa Gg Rr<small>${n} · Hamburgefonstiv 0123</small></div>`;
    case "vibe": return `<div class="s-vibe"><b>${n}</b><span>${d}</span></div>`;
  }
}
const card = (i: number) => document.getElementById("tcard" + i);

export function renderTray(kind: SampleKind): void {
  const box = $("tray"); box.innerHTML = "";
  match().fighters.forEach((ch, i) => {
    const c = el("div", `tcard s${i}`); c.id = "tcard" + i;
    c.innerHTML = `<div class="top"><span class="nm"></span><span class="hpn"></span></div><div class="hp"><b></b><i></i></div><div class="sample"></div>`;
    c.setAttribute("aria-label", ch.name);
    const name = q(c, ".nm"), sample = q(c, ".sample");
    name.textContent = ch.name; name.style.fontFamily = fam(ch);
    sample.innerHTML = sampleHTML(kind); sample.style.fontFamily = fam(ch);
    box.append(c);
  });
  updateTray();
}
/** Refreshes HP on the scoreboard. `hitIdx` jolts that fighter's card. */
export function updateTray(hitIdx?: number): void {
  const m = match();
  m.fighters.forEach((ch, i) => {
    const c = card(i); if (!c) return;
    c.classList.toggle("ko", ch.hp <= 0); c.classList.toggle("win", m.winner === ch);
    q(c, ".hpn").innerHTML = `${ch.hp}<small>HP</small>`;
    const bar = q(c, ".hp i"); bar.style.width = ch.hp + "%"; bar.classList.toggle("low", ch.hp < 35);
    q(c, ".hp b").style.width = ch.hp + "%";
    if (i === hitIdx) { c.classList.remove("hit"); void c.offsetWidth; c.classList.add("hit"); }
  });
}
export function setTrayKind(kind: SampleKind): void {
  match().fighters.forEach((_, i) => {
    const s = card(i)?.querySelector<HTMLElement>(".sample"); if (!s) return;
    s.style.opacity = "0";
    setTimeout(() => { s.innerHTML = sampleHTML(kind); s.style.opacity = "1"; }, 200);
  });
}
export const markLead = (lead: Fighter | null): void => { match().fighters.forEach((f, i) => card(i)?.classList.toggle("lead", f === lead)); };

/* ---------- Dialogue ---------- */
let spoken: Promise<void> = Promise.resolve();
/** Lower third: a name tab in the speaker's corner colour over a paper bar set in the speaker's own font. Spoken aloud when voices are on. */
export function say(ch: Fighter | null, text: string, extra?: string): void {
  const d = $("dialog"); d.innerHTML = "";
  match().fighters.forEach(f => { f.talking = false; });
  const voiced = voice.on && !time.rush; // hurrying a round skips the voices too
  const who = el("span", "who", ch ? ch.name : "The arena");
  if (ch) {
    who.style.setProperty("--acc", ch.color); ch.talking = true;
    if (!voiced) setTimeout(() => { ch.talking = false; }, Math.min(2200, 300 + text.length * 35));
  }
  const bar = el("div", "bar3"), line = el("span", "line" + (ch ? "" : " narr"), ch ? `“${text}”` : text);
  if (ch) line.style.fontFamily = fam(ch);
  bar.append(line); if (extra) bar.append(el("span", "dmg", extra));
  d.append(who, bar);
  spoken = voiced ? voice.speak(ch, text) : Promise.resolve();
}
/** Holds the scene until the line is finished: at least `ms` of reading time, longer if it is still being spoken. */
export const hold = (ms: number): Promise<unknown> => Promise.all([spoken, wait(ms)]);

/** Score bug: a small label, the round title, and one tick per round. */
export function setPill(label: string, title: string): void {
  const m = match();
  $("pillKicker").textContent = label; $("pillTitle").textContent = title;
  const dots = $("pillDots"); dots.innerHTML = "";
  m.criteria.forEach((_, i) => dots.append(el("i", i < m.round ? "done" : i === m.round ? "now" : "")));
}
export function setNext(label: string, enabled = true): void {
  const b = $<HTMLButtonElement>("next");
  b.innerHTML = `${esc(label)} <kbd>Space</kbd>`; b.disabled = !enabled;
}
/** Listeners turn to the speaker; the speaker faces the audience. */
export const lookAll = (target: Fighter): void => { match().fighters.forEach(f => { if (f.hp > 0) f.lookAt = f === target ? null : target; }); };

export function setSoundIcon(): void {
  const off = sfx.muted, b = $("sound");
  b.innerHTML = `<svg class="i"><use href="#i-${off ? "mute" : "sound"}"/></svg>`;
  b.setAttribute("aria-label", off ? "Turn on sound and voices" : "Mute sound and voices");
  b.title = off ? "Sound and voices are off" : "Sound and voices are on";
}

/** A one-time tip pointing at `anchor`. Returns a function that dismisses it, or null if it was already seen. */
export function coach(anchor: HTMLElement, text: string, key: string, arrowLeft?: number): (() => void) | null {
  if (store.get("coach-" + key, false)) return null;
  const done = () => { c.remove(); store.set("coach-" + key, true); };
  const r = anchor.getBoundingClientRect(), c = el("div", "coach", text);
  const x = el("button", "x", "Got it"); x.type = "button"; x.onclick = done; c.append(x);
  document.body.append(c);
  const w = c.offsetWidth, h = c.offsetHeight, left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2));
  c.style.left = left + "px"; c.style.top = Math.max(8, r.top - h - 16) + "px";
  c.style.setProperty("--arrow", (arrowLeft ?? r.left + r.width / 2 - left) + "px");
  return () => { if (c.isConnected) done(); };
}

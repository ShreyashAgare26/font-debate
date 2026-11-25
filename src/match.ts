// Step 3: the debate. Opening statements, rounds with cinematic attacks and knockouts, then the winner's ceremony.
import * as THREE from "three";
import { app, match, showScreen } from "./app";
import { crowd, setJumbo } from "./arena";
import { sfx, voice } from "./audio";
import { cam, camArrived, shotImpact, shotOn, shotOverShoulder, shotWide, showLabels } from "./camera";
import { CENTER, LYING, PODIUM_TOP, setMood, type Fighter } from "./characters";
import { ROUND_COPY, TONE_LINES } from "./copy";
import { addStars, confetti, damageNumber, debris, flashScreen, letterbox, shockwave } from "./effects";
import { closeHelp, helpOverGame } from "./help";
import { coach, hold, lookAll, markLead, renderTray, say, setNext, setPill, setSoundIcon, setTrayKind, updateTray } from "./hud";
import { closePicker, pickerIsOpen } from "./lineup";
import { playRound, winnerOf, type Criterion } from "./logic";
import { canvas } from "./scene";
import { gtween, hitStop, slowMo, time, wait } from "./time";
import { $, RM, ease, easeOut, fam, q, sleep } from "./util";
import { showVerdict } from "./verdict";

const autoPlay = () => $<HTMLInputElement>("auto").checked;
let dismissCoach: (() => void)[] = [];
function clearCoach(): void { dismissCoach.forEach(f => f()); dismissCoach = []; }
const hop = (ch: Fighter, height: number, ms = 420) => gtween(ms, t => { ch.root.position.y = Math.sin(t * Math.PI) * height; });

export async function startFight(): Promise<void> {
  const m = match();
  sfx.unlock();
  m.round = 0; m.winner = null; m.final = null;
  m.fighters.forEach(ch => { ch.lookAt = null; });
  showScreen("fight"); renderTray("intro"); setNext("Round 1", false); setSoundIcon();
  app.busy = true; time.rush = false;
  const rounds = m.criteria.length;
  setJumbo(m.name, "Font Debate", `${rounds} rounds · last one standing wins`);
  setPill("Opening statements", "Meet the contenders");
  shotWide(); say(null, `Three typefaces think they're right for ${m.name}. Let's hear them out.`); crowd.cheer = 1; sfx.cheer(1.4);
  await hold(1800);
  for (const ch of m.fighters) {
    shotOn(ch); lookAll(ch); await camArrived();
    void hop(ch, 1.1); markLead(ch); setMood(ch, "smug");
    say(ch, ch.pro); crowd.cheer = 0.6; await hold(2500); setMood(ch, "idle");
  }
  markLead(null); m.fighters.forEach(f => { f.lookAt = null; });
  shotWide(); say(null, `${rounds} rounds, one for each part of your brief. Lose a round and you lose HP. Hit zero and you're out.`);
  setPill("Ready", `${rounds} rounds ahead`);
  app.busy = false; time.rush = false; setNext("Round 1");
  dismissCoach = [coach($("next"), "Press Space or tap here to start each round.", "next"), coach($("tray"), "These cards show every round's test in each font. Compare them yourself.", "tray", 60)].filter(f => f !== null);
  if (autoPlay()) autoAdvance();
}

/** [title, what it tests, the leader's boast] */
function roundInfo(c: Criterion): [string, string, string] {
  return c.kind === "use" ? ROUND_COPY[c.key] : [`Vibe check: ${c.key}`, `Which one feels most ${c.key}?`, TONE_LINES[c.key]];
}

async function nextRound(): Promise<void> {
  if (app.busy) { time.rush = true; voice.stop(); return; } // pressing Next mid-round hurries it
  const m = match();
  clearCoach();
  if (m.round >= m.criteria.length || m.fighters.filter(f => f.hp > 0).length <= 1) return finish();
  const c = m.criteria[m.round], rounds = m.criteria.length;
  app.busy = true; time.rush = false; setNext("Faster ▸▸");
  const [title, sub, boast] = roundInfo(c);
  setPill(`Round ${m.round + 1} of ${rounds}`, title);
  setJumbo(`Round ${m.round + 1} / ${rounds}`, title, sub);
  setTrayKind(c.kind === "use" ? c.key : "vibe");
  shotWide(); say(null, `Round ${m.round + 1}: ${title}. ${sub}`); sfx.bell(); crowd.cheer = 0.8;
  await hold(2200);
  const { leaders, hits } = playRound(m.fighters, c);
  m.round++;
  if (!hits.length) {
    say(null, "Dead even. Every font holds its ground.");
    m.fighters.filter(f => f.hp > 0).forEach(f => { setMood(f, "smug"); void hop(f, 0.5, 400); });
    await hold(1600);
  } else {
    const lead = leaders[0];
    letterbox(true); markLead(lead); lookAll(lead);
    shotOn(lead, { dur: 500 }); await camArrived();
    setMood(lead, "smug"); await hop(lead, 1.4);
    say(lead, boast); await hold(1900);
    for (const h of hits) await attack(lead, h.f, h.dmg);
    letterbox(false); markLead(null);
  }
  m.fighters.forEach(f => { f.lookAt = null; if (f.hp > 0) setMood(f, "idle"); });
  shotWide();
  const last = m.round >= rounds || m.fighters.filter(f => f.hp > 0).length <= 1;
  if (hits.length) say(null, `Round ${m.round} goes to ${leaders.map(l => l.name).join(" and ")}.${last ? " That's the final bell." : ""}`);
  setPill(`Round ${m.round} of ${rounds} done`, last ? "Final bell" : `Next: ${roundInfo(m.criteria[m.round])[0]}`);
  app.busy = false; time.rush = false;
  setNext(last ? "See the verdict" : `Round ${m.round + 1}`);
  if (autoPlay()) autoAdvance();
}
let autoTimer: ReturnType<typeof setTimeout> | undefined;
function autoAdvance(): void {
  clearTimeout(autoTimer);
  autoTimer = setTimeout(() => { if (autoPlay() && !app.busy && app.screen === "fight") void nextRound(); }, 1600);
}

/** One hit: trash talk over the shoulder, wind-up, dash, impact with hit-stop, then either knockback or a knockout. */
async function attack(att: Fighter, def: Fighter, dmg: number): Promise<void> {
  const m = match(), ko = def.hp <= 0;
  const a0 = att.root.position.clone(), d0 = def.root.position.clone(), dir = d0.clone().sub(a0).setY(0).normalize();
  att.lookAt = def; def.lookAt = att; setMood(att, "angry"); setMood(def, "idle");
  shotOverShoulder(att, def);
  say(att, def.con, `${def.name} −${dmg} HP`);
  await hold(1300);
  // wind-up, then dash
  const windUp = a0.clone().addScaledVector(dir, -0.6), stop = d0.clone().addScaledVector(dir, -1.7), torso = att.torso;
  att.lockYaw = true; att.root.rotation.y = Math.atan2(dir.x, dir.z);
  await gtween(200, t => { att.root.position.lerpVectors(a0, windUp, easeOut(t)); torso.scale.x = 1 + t * 0.12; torso.userData.sy = 1 - t * 0.15; att.punch = -t; });
  sfx.whoosh();
  await gtween(170, t => { att.root.position.lerpVectors(windUp, stop, t * t); att.root.position.y = Math.sin(t * Math.PI) * 0.6; torso.scale.x = 0.9; torso.userData.sy = 1.15; att.punch = Math.max(0.01, t); });
  // impact
  torso.scale.x = 1; torso.userData.sy = 1;
  shotImpact(def, att); void flashScreen(ko ? 1 : 0.75); sfx.impact(ko ? 1 : dmg / 50);
  shockwave(d0, att.color); debris(d0, att, m.name, ko ? 24 : 14); damageNumber(d0, dmg);
  setMood(def, "hurt"); updateTray(m.fighters.indexOf(def)); crowd.cheer = 1.3; cam.shake = ko ? 1 : 0.6;
  await hitStop(ko ? 160 : 95);
  const knockedBack = d0.clone().addScaledVector(dir, 0.9);
  if (ko) await knockout(def, att, dir);
  else {
    slowMo(0.35, 420);
    await gtween(300, t => { def.root.position.lerpVectors(d0, knockedBack, easeOut(t)); def.rig.rotation.x = -0.45 * Math.sin(t * Math.PI); });
  }
  // the attacker returns to its podium
  shotWide({ dur: 550 });
  await gtween(380, t => { att.root.position.lerpVectors(stop, a0, ease(t)); att.root.position.y = Math.sin(t * Math.PI) * 0.4; att.punch = 1 - t; });
  att.punch = 0; att.lockYaw = false; setMood(att, "smug");
  if (!ko) { void gtween(380, t => { def.root.position.lerpVectors(knockedBack, d0, ease(t)); }); setMood(def, "idle"); }
  await wait(500);
}

/** Slow motion, drained colour, a circling camera and the K.O. title while the loser is thrown off its podium. */
async function knockout(def: Fighter, att: Fighter, dir: THREE.Vector3): Promise<void> {
  sfx.ko(); crowd.cheer = 2;
  if (!RM) { time.scale = 0.25; canvas.style.filter = "saturate(.15) contrast(1.2)"; }
  showLabels(false);
  cam.orbit = { at: def.root.position.clone(), r: 5.2, h: 2.4, lookY: 1.6, speed: RM ? 0 : 1.6, a: Math.atan2(dir.z, -dir.x) };
  const title = $("ko");
  q(title, "span").style.fontFamily = fam(att);
  title.classList.remove("hidden", "show"); void title.offsetWidth; title.classList.add("show");
  setMood(def, "ko"); def.lockYaw = true; def.talking = false;
  const p0 = def.root.position.clone(), y0 = def.root.rotation.y;
  await gtween(420, t => {
    def.root.position.copy(p0).addScaledVector(dir, 2.2 * easeOut(t)); def.root.position.y = Math.sin(t * Math.PI) * 1.6;
    def.root.rotation.y = y0 + t * Math.PI * 1.5; def.rig.rotation.x = (-t * Math.PI) / 2;
    def.lift.position.y = PODIUM_TOP + (LYING - PODIUM_TOP) * t * t; // it lands on the floor, off its podium
  });
  def.blob.visible = false; addStars(def); sfx.cheer(2);
  await wait(1500);
  time.scale = 1; canvas.style.filter = ""; title.classList.add("hidden"); cam.orbit = null;
  say(null, `${def.name} is knocked out!`);
  await hold(1400); // let the call finish before the next line cuts it off
}

/** Plays out any rounds left (silently, same rules), crowns the winner and opens the verdict. */
async function finish(): Promise<void> {
  if (app.busy) return;
  const m = match();
  app.busy = true; clearTimeout(autoTimer); clearCoach();
  setNext("…", false);
  while (m.round < m.criteria.length && m.fighters.filter(f => f.hp > 0).length > 1) playRound(m.fighters, m.criteria[m.round++]);
  for (const f of m.fighters) if (f.hp <= 0 && f.mood !== "ko") { setMood(f, "ko"); f.rig.rotation.x = -Math.PI / 2; f.lift.position.y = PODIUM_TOP + LYING; f.blob.visible = false; }
  const w = winnerOf(m.fighters, m.criteria);
  m.winner = w; m.final = w;
  updateTray(); markLead(null);
  setPill("Last one standing", w.name);
  setJumbo("Last one standing", w.name, `the font for ${m.name}`, fam(w));
  say(w, "I'll take it from here."); setMood(w, "happy");
  letterbox(true);
  const losers = m.fighters.filter(f => f !== w), podium = w.podium!;
  await gtween(800, t => losers.forEach(f => { f.root.position.y = -t * 4; f.podium!.position.y = -t * 4; }));
  for (const f of losers) { f.root.visible = false; f.podium!.visible = false; if (f.spot) f.spot.visible = false; }
  const from = podium.position.clone();
  w.lookAt = null; w.yaw = w.homeYaw = 0;
  await gtween(1100, t => {
    const k = ease(t);
    podium.position.lerpVectors(from, CENTER, k); podium.scale.y = 1 + k; // the podium doubles in height
    w.root.position.lerpVectors(from, CENTER, k); w.root.position.y = k * PODIUM_TOP + Math.sin(t * Math.PI) * 1.6;
  });
  sfx.fanfare(); sfx.cheer(2.5); confetti(w); crowd.cheer = 2.2;
  // A gentle sway in front of the winner, so we always see its face
  cam.orbit = { at: CENTER.clone(), r: 8.5, h: 4.9, lookY: 3.3, speed: RM ? 0 : 0.35, a: 0, sway: 0.55 };
  await sleep(1400);
  letterbox(false);
  showVerdict();
  app.busy = false;
}

export function initMatch(): void {
  // "Skip" during a round hurries it, then finishes as soon as the round is over
  let skipWhenFree = false;
  $("next").onclick = () => { void nextRound(); };
  $("skip").onclick = () => { voice.stop(); if (app.busy) { time.rush = true; skipWhenFree = true; } else void finish(); };
  setInterval(() => { if (skipWhenFree && !app.busy && app.screen === "fight") { skipWhenFree = false; void finish(); } }, 200);
  $("auto").onchange = () => { if (autoPlay() && !app.busy) autoAdvance(); };
  $("sound").onclick = () => { sfx.toggle(); voice.stop(); setSoundIcon(); };
  addEventListener("keydown", e => {
    if (e.key === "Escape") { if (pickerIsOpen()) closePicker(); else closeHelp(); return; }
    const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName ?? "");
    if ((e.code === "Space" || e.key === "Enter") && app.screen === "fight" && !typing && !helpOverGame()) { e.preventDefault(); void nextRound(); }
  });
}

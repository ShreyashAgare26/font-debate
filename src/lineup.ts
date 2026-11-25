// Step 2: the lineup ("tale of the tape") and the font picker that can swap any contender for any Google font.
import * as THREE from "three";
import { app, match, showScreen } from "./app";
import { setJumbo } from "./arena";
import { sfx } from "./audio";
import { chips } from "./brief";
import { camIdle, shotLineup } from "./camera";
import { HOME, buildCharacter, stage, type Fighter } from "./characters";
import { loadFonts, queuePreview } from "./fonts";
import { KIND_LABEL, allFonts, fitPct, type Font, type Kind } from "./logic";
import { startFight } from "./match";
import { glyphTexture, mesh, smooth } from "./scene";
import { gtween } from "./time";
import { $, SLOT, el, fam, q, sleep } from "./util";
import { setFinal } from "./verdict";

/** Giant letters floating behind the stands, one per contender. */
export const floaters: THREE.Mesh[] = [];

function buildPodium(color: string, home: THREE.Vector3): THREE.Group {
  const podium = new THREE.Group();
  const base = mesh(new THREE.CylinderGeometry(1.9, 2.2, 0.7, 48), smooth(0x232c4d, { roughness: 0.5 })); base.position.y = 0.35;
  const cap = mesh(new THREE.CylinderGeometry(1.78, 1.78, 0.04, 48), smooth(0x2e3961, { roughness: 0.35, metalness: 0.2 }), false); cap.position.y = 0.71;
  const ring = mesh(new THREE.TorusGeometry(1.92, 0.085, 10, 64), smooth(color, { emissive: color, emissiveIntensity: 1 }), false);
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.72;
  const foot = mesh(new THREE.TorusGeometry(2.22, 0.05, 8, 64), smooth(color, { emissive: color, emissiveIntensity: 0.6 }), false);
  foot.rotation.x = Math.PI / 2; foot.position.y = 0.04;
  podium.add(base, cap, ring, foot); podium.position.copy(home);
  return podium;
}

/** Loads the lineup's fonts and puts three fresh fighters on stage. */
export async function buildFighters(): Promise<void> {
  const m = match();
  await loadFonts(m.lineup);
  stage.clear(); floaters.length = 0; m.partner = null;
  m.fighters = m.lineup.map((font, i): Fighter => {
    const ch = buildCharacter({ ...font, hp: 100, color: SLOT[i], slot: i, home: HOME[i].clone() });
    ch.podium = buildPodium(ch.color, ch.home); stage.add(ch.podium);
    // A key light per corner so each fighter stands in its own pool of light
    ch.spot = new THREE.SpotLight(0xffffff, 0.6, 40, 0.3, 0.8, 1.2);
    ch.spot.position.set(ch.home.x * 0.7, 15, ch.home.z + 7); ch.spot.target = ch.podium; stage.add(ch.spot);
    const glow = new THREE.PointLight(ch.color, 0.55, 7, 2); glow.position.copy(ch.home).setY(1.2).add(new THREE.Vector3(0, 0, 1.6)); stage.add(glow);
    ch.root.position.copy(ch.home).setY(0); stage.add(ch.root);
    ch.yaw = ch.homeYaw = Math.atan2(-ch.home.x, 18 - ch.home.z);
    return ch;
  });
  m.fighters.forEach((ch, i) => {
    const letter = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.MeshBasicMaterial({ map: glyphTexture(ch.name, ["A", "g", "&"][i], "#e9edf2", 512), transparent: true, side: THREE.DoubleSide, opacity: 0.85 }));
    letter.position.set((i - 1) * 20, 9 + (i === 1 ? 6 : 0), -24 - (i === 1 ? 10 : 0)); letter.userData.spin = 0.2 + i * 0.07;
    stage.add(letter); floaters.push(letter);
  });
}

export async function enterLineup(): Promise<void> {
  await buildFighters();
  const m = match();
  showScreen("lineup"); shotLineup();
  setJumbo(m.name, "Meet the contenders", "keep them or swap any font");
  renderLineup();
  for (const ch of m.fighters) { void gtween(380, t => { ch.root.position.y = Math.sin(t * Math.PI) * 1.2; }); sfx.pop(); await sleep(140); }
  $("startFight").focus();
}

const CORNERS = ["Blue corner", "Green corner", "Amber corner"];
function renderLineup(): void {
  const m = match(), changed = m.lineup.some((f, i) => f !== m.recommended[i]);
  $("lineupSub").textContent = changed
    ? `Your lineup for ${m.name}. The debate judges them on your brief either way.`
    : `Our three bookings for ${m.name}, ranked by fit. Keep them, or swap in a font you already have in mind.`;
  $("resetLineup").classList.toggle("hidden", !changed);
  const box = $("slots"); box.innerHTML = "";
  m.fighters.forEach((ch, i) => {
    const mine = m.lineup[i] !== m.recommended[i], pct = fitPct(ch, m.criteria);
    const s = el("div", `slot s${i} wipe`); s.style.animationDelay = 120 + i * 90 + "ms";
    s.innerHTML = `<span class="corner">${CORNERS[i]}${mine ? "<em>Your pick</em>" : ""}</span>
      <div class="fname"></div><div class="spec"></div>
      <div class="fit"><b>${pct}<small>%</small></b><span class="meter"><i style="width:${pct}%"></i></span><span class="note">fit</span></div>
      <dl class="stats"><dt>Style</dt><dd>${KIND_LABEL[ch.cat]}</dd><dt>Weights</dt><dd>${ch.weights.length}</dd><dt>Scores</dt><dd>${ch.estimated ? "Estimated" : "Hand-scored"}</dd></dl>
      <p class="pro"></p>`;
    const fname = q(s, ".fname"), spec = q(s, ".spec");
    fname.textContent = ch.name; fname.style.fontFamily = fam(ch);
    spec.textContent = m.name; spec.style.fontFamily = fam(ch);
    q(s, ".pro").textContent = ch.pro;
    const swap = el("button", "btn small"); swap.type = "button";
    swap.innerHTML = `<svg class="i"><use href="#i-swap"/></svg>Swap font`; swap.onclick = () => openPicker(i);
    s.append(swap); box.append(s);
  });
}

/* ---------- Font picker ---------- */
type CatFilter = "All" | Kind;
const CAT_FILTERS: CatFilter[] = ["All", "Sans", "Serif", "Display", "Hand", "Mono"];
const CAT_LABELS: Record<CatFilter, string> = { All: "All", ...KIND_LABEL };
/** Which contender slot is being swapped, or -1 when choosing the final font on the verdict. */
let pickSlot = 0, pickCat: CatFilter = "All";
let rows: Font[] | null = null;
const fits = new Map<Font, number>();
let previews: IntersectionObserver | null = null;

export function openPicker(slot: number): void {
  const m = match();
  pickSlot = slot;
  $("pTitle").textContent = slot < 0 ? "Pick your own font" : `Swap ${m.lineup[slot].name} for…`;
  rows ??= allFonts();
  for (const f of rows) fits.set(f, fitPct(f, m.criteria));
  $("picker").classList.remove("hidden");
  $<HTMLInputElement>("pSearch").value = ""; renderPicker(); $("pSearch").focus();
}
export const pickerIsOpen = () => !$("picker").classList.contains("hidden");
export function closePicker(): void { $("picker").classList.add("hidden"); if (app.match) app.match.pickForVerdict = false; }

function renderCats(): void {
  chips($("pCats"), CAT_FILTERS, new Set([pickCat]), CAT_LABELS, k => { pickCat = k; renderCats(); renderPicker(); });
}
const LIMIT = 80;
function renderPicker(): void {
  if (!rows) return;
  const m = match(), query = $<HTMLInputElement>("pSearch").value.trim().toLowerCase(), sort = $<HTMLSelectElement>("pSort").value;
  const fitOf = (f: Font) => fits.get(f) ?? 0;
  const found = rows.filter(f => (pickCat === "All" || f.cat === pickCat) && (!query || f.name.toLowerCase().includes(query)));
  found.sort(sort === "fit" ? (a, b) => fitOf(b) - fitOf(a) || a.pop - b.pop : sort === "pop" ? (a, b) => a.pop - b.pop : (a, b) => a.name.localeCompare(b.name));
  const list = $("pList"); list.innerHTML = ""; list.scrollTop = 0;
  const taken = new Set(m.lineup.map(f => f.name));
  for (const f of found.slice(0, LIMIT)) {
    const b = el("button", "prow"); b.type = "button"; b.dataset.name = f.name; b.setAttribute("role", "option"); b.disabled = taken.has(f.name);
    const name = el("span", "pn", f.name); name.style.fontFamily = fam(f);
    const meta = el("span", "pm", `${KIND_LABEL[f.cat]} · ${f.weights.length} weight${f.weights.length > 1 ? "s" : ""}${taken.has(f.name) ? " · already in the lineup" : ""}`);
    const pct = el("span", "pf"); pct.append(`${fitOf(f)}%`, el("small", null, f.curated ? "hand-scored" : "estimated"));
    b.append(name, meta, pct); b.onclick = () => { void choose(f); };
    list.append(b); previews?.observe(b);
  }
  $("pCount").textContent = !found.length ? "No fonts match. Try a shorter search."
    : found.length > LIMIT ? `Showing ${LIMIT} of ${found.length.toLocaleString()} fonts. Keep typing to narrow it down.`
    : `${found.length.toLocaleString()} font${found.length > 1 ? "s" : ""}`;
}
async function choose(f: Font): Promise<void> {
  const m = match(), forVerdict = m.pickForVerdict;
  closePicker();
  if (forVerdict) { await loadFonts([...m.fighters, f]); setFinal(f); return; }
  m.lineup[pickSlot] = f;
  await buildFighters(); renderLineup(); sfx.pop();
  const ch = m.fighters[pickSlot];
  void gtween(420, t => { ch.root.position.y = Math.sin(t * Math.PI) * 1.6; });
}

export function initLineup(): void {
  $("toBrief").onclick = () => { showScreen("brief"); camIdle(); };
  $("resetLineup").onclick = async () => { const m = match(); m.lineup = m.recommended.slice(); await buildFighters(); renderLineup(); };
  $("startFight").onclick = () => { void startFight(); };
  $("pClose").onclick = closePicker;
  $("picker").addEventListener("click", e => { if (e.target === $("picker")) closePicker(); });
  $("pSearch").addEventListener("input", renderPicker);
  $("pSort").onchange = renderPicker;
  // Each row's name is previewed in its own font, fetched only when the row scrolls into view
  previews = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { const name = (e.target as HTMLElement).dataset.name; if (name) queuePreview(name); previews?.unobserve(e.target); }
  }, { root: $("pList") });
  renderCats();
}

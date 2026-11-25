// Step 1: the brief. Product name, description, personality (up to three) and where the font will be used.
import { app } from "./app";
import { sfx } from "./audio";
import { EXAMPLES } from "./copy";
import { enterLineup } from "./lineup";
import { TONES, USES, USE_KEYS, detectTones, pickContenders, type Criterion, type Tone, type Use } from "./logic";
import { $, el, q, store } from "./util";

const MAX_TONES = 3;
const tonesOn = new Set<Tone>(), usesOn = new Set<Use>(["ui", "head"]);
/** Tones the user set by hand (never auto-changed) and tones we picked from their words (shown with a dot). */
const userTouched = new Set<Tone>(), autoTones = new Set<Tone>();
const nameInput = () => $<HTMLInputElement>("name"), descInput = () => $<HTMLTextAreaElement>("desc");

/** Renders a row of toggle chips. */
export function chips<K extends string>(box: HTMLElement, items: readonly K[], on: ReadonlySet<K>, labels: Record<K, string> | null, onToggle: (k: K) => void, auto?: ReadonlySet<K>): void {
  box.innerHTML = "";
  for (const k of items) {
    const b = el("button", "chip" + (auto?.has(k) && on.has(k) ? " auto" : ""), labels ? labels[k] : k[0].toUpperCase() + k.slice(1));
    b.type = "button"; b.setAttribute("aria-pressed", String(on.has(k)));
    b.onclick = () => onToggle(k);
    box.append(b);
  }
}
const setError = (text: string) => { $("briefErr").textContent = text; };

function renderTones(): void {
  chips($("tones"), TONES, tonesOn, null, k => {
    userTouched.add(k); autoTones.delete(k);
    if (tonesOn.has(k)) tonesOn.delete(k);
    else if (tonesOn.size >= MAX_TONES) { setError(`Pick up to ${MAX_TONES}. Tap one to remove it first.`); return; }
    else tonesOn.add(k);
    setError(""); renderTones();
  }, autoTones);
  $("toneCount").textContent = `${tonesOn.size} / ${MAX_TONES}`;
  $("toneLegend").classList.toggle("hidden", ![...autoTones].some(k => tonesOn.has(k)));
  renderRounds();
}
function renderUses(): void {
  chips($("uses"), USE_KEYS, usesOn, USES, k => { if (!usesOn.delete(k)) usesOn.add(k); setError(""); renderUses(); });
  renderRounds();
}
function renderRounds(): void {
  const n = tonesOn.size + usesOn.size;
  $("roundsNote").textContent = n ? `${n} round${n === 1 ? "" : "s"} booked. Each pick is one round.` : "Each pick becomes a round.";
}
/** Reads personality from the description, without touching anything the user set by hand. */
function autoDetect(): void {
  const found = detectTones(descInput().value);
  for (const k of [...autoTones]) if (!found.includes(k)) { tonesOn.delete(k); autoTones.delete(k); }
  for (const k of found) if (!tonesOn.has(k) && !userTouched.has(k) && tonesOn.size < MAX_TONES) { tonesOn.add(k); autoTones.add(k); }
  renderTones();
}
const criteriaNow = (): Criterion[] => [...[...tonesOn].map(key => ({ kind: "tone" as const, key })), ...[...usesOn].map(key => ({ kind: "use" as const, key }))];

interface SavedBrief { name?: unknown; desc?: unknown; tones?: unknown; uses?: unknown }
/** Picks up where the last visit left off. */
function restore(): void {
  const b = store.get<SavedBrief | null>("brief", null);
  if (!b || typeof b.name !== "string") return;
  nameInput().value = b.name; descInput().value = typeof b.desc === "string" ? b.desc : "";
  const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
  tonesOn.clear();
  for (const k of TONES) if (list(b.tones).includes(k) && tonesOn.size < MAX_TONES) { tonesOn.add(k); userTouched.add(k); }
  usesOn.clear();
  for (const k of USE_KEYS) if (list(b.uses).includes(k)) usesOn.add(k);
  if (!usesOn.size) usesOn.add("ui");
}

async function submit(e: SubmitEvent): Promise<void> {
  e.preventDefault(); sfx.unlock();
  const name = nameInput().value.trim(), desc = descInput().value.trim();
  if (!name) { setError("Give your product a name. The fonts will use it."); nameInput().focus(); return; }
  if (!usesOn.size) { setError("Pick at least one place the font will be used."); return; }
  if (!tonesOn.size) { for (const k of ["friendly", "trustworthy"] as const) { tonesOn.add(k); autoTones.add(k); } renderTones(); }
  const criteria = criteriaNow(), recommended = pickContenders(criteria);
  app.match = { name, desc, criteria, recommended, lineup: recommended.slice(), fighters: [], round: 0, winner: null, final: null, pairs: [], pairIdx: -1, partner: null, pickForVerdict: false };
  store.set("brief", { name, desc, tones: [...tonesOn], uses: [...usesOn] });
  const go = $<HTMLButtonElement>("briefGo"), label = go.innerHTML;
  go.disabled = true; go.textContent = "Booking the contenders";
  try { await enterLineup(); } finally { go.disabled = false; go.innerHTML = label; }
}

export function initBrief(): void {
  restore();
  renderTones(); renderUses();
  descInput().addEventListener("input", autoDetect);
  const examples = q(document, ".examples");
  for (const ex of EXAMPLES) {
    const b = el("button", "chip", ex.label); b.type = "button";
    b.onclick = () => {
      nameInput().value = ex.name; descInput().value = ex.desc;
      tonesOn.clear(); autoTones.clear(); userTouched.clear(); autoDetect();
      usesOn.clear(); ex.uses.forEach(u => usesOn.add(u)); renderUses();
      setError(""); sfx.pop();
    };
    examples.append(b);
  }
  $<HTMLFormElement>("briefForm").onsubmit = e => { void submit(e); };
}

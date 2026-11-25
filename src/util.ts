import { FALLBACK, type Font } from "./logic";

/** Element by id. Every id used here exists in index.html, so a miss is a programming error worth failing loudly on. */
export function $<T extends HTMLElement = HTMLElement>(id: string): T {
  const e = document.getElementById(id);
  if (!e) throw new Error(`Missing element #${id}`);
  return e as T;
}
/** First match inside `root`. Used for markup this code just created, so a miss is a bug. */
export function q<T extends HTMLElement = HTMLElement>(root: ParentNode, selector: string): T {
  const e = root.querySelector<T>(selector);
  if (!e) throw new Error(`Missing element ${selector}`);
  return e;
}
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string | null, text?: string | null): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
export const esc = (s: unknown): string => String(s).replace(/[&<>"]/g, c => ESCAPES[c]);
export const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));
export const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

/** Corner colours: blue, green, amber. Shared by the 3D arena and the CSS (--c0..--c2). */
export const SLOT = ["#3d8bff", "#34c46b", "#ffb020"] as const;
/** CSS / canvas font-family value for a font, with a same-category fallback. */
export const fam = (f: Pick<Font, "name" | "cat">) => `"${f.name}", ${FALLBACK[f.cat]}`;
/** The user asked the OS for less motion: no shake, flashes, slow motion or camera moves. */
export const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Small persisted settings. Storage can be blocked (private windows), so every access is guarded. */
export const store = {
  get<T>(key: string, fallback: T): T {
    try { const v = localStorage.getItem("fd3d-" + key); return v == null ? fallback : (JSON.parse(v) as T); } catch { return fallback; }
  },
  set(key: string, value: unknown): void {
    try { localStorage.setItem("fd3d-" + key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  },
};

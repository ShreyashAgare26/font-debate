// Loading Google Fonts on demand.
import { gfFamily, type Font } from "./logic";
import { $, sleep } from "./util";

/** Loads the regular and bold cuts of these fonts and waits until canvases can draw with them. */
export async function loadFonts(list: Pick<Font, "name" | "weights">[]): Promise<void> {
  document.body.classList.add("busy");
  try {
    const link = $<HTMLLinkElement>("fightFonts");
    link.href = "https://fonts.googleapis.com/css2?" + list.map(gfFamily).join("&") + "&display=swap";
    await new Promise<void>(r => { link.onload = () => r(); link.onerror = () => r(); setTimeout(r, 5000); });
    const faces = list.flatMap(f => [document.fonts.load(`400 40px "${f.name}"`, "Aa"), document.fonts.load(`700 40px "${f.name}"`, "Aa")]);
    await Promise.race([Promise.all(faces), sleep(4000)]).catch(() => { /* a font that fails to load falls back to the category default */ });
  } finally {
    document.body.classList.remove("busy");
  }
}

// Previews in the picker only fetch the letters of each font's own name.
const previewQueue = new Set<string>(), previewed = new Set<string>();
let previewTimer: ReturnType<typeof setTimeout> | undefined;
export function queuePreview(name: string): void {
  if (previewed.has(name)) return;
  previewed.add(name); previewQueue.add(name);
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    const names = [...previewQueue]; previewQueue.clear();
    if (!names.length) return;
    const text = [...new Set(names.join(""))].join("");
    const link = document.createElement("link"); link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?" + names.map(n => "family=" + encodeURIComponent(n).replace(/%20/g, "+")).join("&") + "&text=" + encodeURIComponent(text) + "&display=swap";
    document.head.append(link);
  }, 120);
}

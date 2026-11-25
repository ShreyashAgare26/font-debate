// Natural voices: Kokoro running in the browser (free, no key, nothing leaves the device).
// Loads in the background; until it is ready, or on devices where it can't run, callers use the browser's built-in voice.

/** How a line should sound, not how it reads: "Clause 14.2" is "clause fourteen point two", not "fourteen", "two". */
export const forSpeech = (text: string): string => text.replace(/(\d)\.(?=\d)/g, "$1 point ");

type State = "off" | "loading" | "ready" | "failed";
/** How a line ended: spoken in full, cut off by a newer line or stop(), or not producible in time (use another voice). */
export type Spoken = "spoken" | "cancelled" | "fallback";
interface Line { id: number; ctx: AudioContext; at: number; sources: AudioBufferSourceNode[]; done: boolean; started: boolean; finish: (how: Spoken) => void }

let worker: Worker | null = null;
let state: State = "off";
let nextId = 0;
let line: Line | null = null;

export const neural = {
  get ready(): boolean { return state === "ready"; },
  get state(): State { return state; },
};

let onProgress: (pct: number | "ready" | "off") => void = () => {};
/** Gets loading progress (0-100), then "ready", or "off" when natural voices won't be used on this device. */
export function onNeuralProgress(fn: typeof onProgress): void { onProgress = fn; }

/**
 * Starts downloading the model (about 330 MB the first time, then cached by the browser).
 * ponytail: natural voices need WebGPU. On the CPU the model runs ~1.6x slower than real time, too slow for a live
 * show, so phones and GPU-less browsers keep the browser voice rather than download a model they can't keep up with.
 */
export async function loadNeural(): Promise<void> {
  if (state !== "off") return;
  const nav = navigator as Navigator & { connection?: { saveData?: boolean }; gpu?: { requestAdapter(): Promise<unknown> } };
  const touch = matchMedia("(pointer: coarse)").matches;
  let gpu = false;
  try { gpu = !!(await nav.gpu?.requestAdapter()); } catch { /* no WebGPU */ }
  if (!gpu || touch || nav.connection?.saveData || typeof Worker === "undefined") { state = "failed"; onProgress("off"); return; }
  state = "loading";
  try {
    worker = new Worker(new URL("./tts.worker.ts", import.meta.url), { type: "module" });
  } catch { state = "failed"; return; }
  worker.onmessage = (e: MessageEvent) => {
    const m = e.data;
    if (m.type === "progress") onProgress(m.pct as number);
    else if (m.type === "ready") { state = "ready"; onProgress("ready"); console.info("[voice] natural voices ready"); }
    else if (m.type === "error") { state = "failed"; onProgress("off"); console.warn("[voice] natural voices unavailable, using the browser voice", m.message); }
    else if (line && m.id === line.id) {
      if (m.type === "chunk") play(line, m.data as Float32Array<ArrayBuffer>, m.rate as number);
      else if (m.type === "done") { line.done = true; settle(line); }
    }
  };
  worker.onerror = () => { state = "failed"; onProgress("off"); };
  worker.postMessage({ type: "load", device: "webgpu", dtype: "fp32" });
}

/** Queues one generated sentence right after the previous one. */
function play(l: Line, data: Float32Array<ArrayBuffer>, rate: number): void {
  const buf = l.ctx.createBuffer(1, data.length, rate);
  buf.copyToChannel(data, 0);
  const src = l.ctx.createBufferSource();
  src.buffer = buf; src.connect(l.ctx.destination);
  l.at = Math.max(l.at, l.ctx.currentTime + 0.02);
  src.start(l.at); l.at += buf.duration;
  src.onended = () => settle(l);
  l.sources.push(src); l.started = true;
}
/** Finished once generation is done and the last scheduled sentence has played. */
function settle(l: Line): void {
  if (l.done && l.ctx.currentTime >= l.at - 0.05) l.finish(l.started ? "spoken" : "fallback");
}

/** Speaks a line in a Kokoro voice. */
export function speakNeural(text: string, voice: string, speed: number, ctx: AudioContext): Promise<Spoken> {
  stopNeural();
  if (!worker || state !== "ready") return Promise.resolve("fallback");
  return new Promise(res => {
    let settled = false;
    const l: Line = { id: ++nextId, ctx, at: 0, sources: [], done: false, started: false,
      finish: how => { if (settled) return; settled = true; clearTimeout(slow); if (line === l) line = null; res(how); } };
    line = l;
    // A slow device that can't start a line in time keeps the show moving with the browser voice
    const slow = setTimeout(() => { if (!l.started) l.finish("fallback"); }, 5000);
    worker!.postMessage({ type: "speak", id: l.id, text, voice, speed });
  });
}

export function stopNeural(): void {
  const l = line;
  if (!l) return;
  line = null;
  for (const s of l.sources) { s.onended = null; try { s.stop(); } catch { /* already stopped */ } }
  l.finish("cancelled");
}

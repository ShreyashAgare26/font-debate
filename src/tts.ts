// Natural voices: Kokoro running in the browser (free, no key, nothing leaves the device).
// Loads in the background; until it is ready, or on devices where it can't run, callers use the browser's built-in voice.

/** How a line should sound, not how it reads: "Clause 14.2" is "clause fourteen point two", not "fourteen", "two". */
export const forSpeech = (text: string): string => text.replace(/(\d)\.(?=\d)/g, "$1 point ");

type State = "off" | "loading" | "ready" | "failed";
/** How a line ended: spoken in full, cut off by a newer line or stop(), or not producible in time (use another voice). */
export type Spoken = "spoken" | "cancelled" | "fallback";
interface Line { id: number; ctx: AudioContext; at: number; sources: AudioBufferSourceNode[]; done: boolean; started: boolean; finish: (how: Spoken) => void; onStart: () => void; deadline: () => void }

let worker: Worker | null = null;
let state: State = "off";
let nextId = 0;
let line: Line | null = null;
/** Lines in a row that couldn't start in time. Two means this device is too slow, so natural voices switch off. */
let misses = 0;

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
  } catch { fail(); return; }
  worker.onmessage = (e: MessageEvent) => {
    const m = e.data;
    if (m.type === "progress") onProgress(m.pct as number);
    else if (m.type === "ready") { state = "ready"; onProgress("ready"); console.info("[voice] natural voices ready"); }
    else if (m.type === "error") { console.warn("[voice] natural voices unavailable, using the browser voice", m.message); fail(); }
    else if (line && m.id === line.id) {
      if (m.type === "chunk") play(line, m.data as Float32Array<ArrayBuffer>, m.rate as number);
      else if (m.type === "done") { line.done = true; settle(line); }
    }
  };
  worker.onerror = () => fail();
  worker.postMessage({ type: "load", device: "webgpu", dtype: "fp32" });
}

/** Switches natural voices off for this visit; a line in progress ends so the scene never waits on it. */
function fail(): void {
  state = "failed"; onProgress("off");
  const l = line;
  if (l) { line = null; l.finish(l.started ? "cancelled" : "fallback"); }
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
  l.sources.push(src);
  if (!l.started) { l.started = true; misses = 0; l.onStart(); }
  l.deadline();
}
/** Finished once generation is done and the last scheduled sentence has played. */
function settle(l: Line): void {
  if (l.done && l.ctx.currentTime >= l.at - 0.05) l.finish(l.started ? "spoken" : "fallback");
}

/** Speaks a line in a Kokoro voice. `onStart` fires when sound actually begins (so mouths move with the audio). */
export function speakNeural(text: string, voice: string, speed: number, ctx: AudioContext, onStart: () => void = () => {}): Promise<Spoken> {
  stopNeural();
  if (!worker || state !== "ready") return Promise.resolve("fallback");
  return new Promise(res => {
    let settled = false, timer: ReturnType<typeof setTimeout> | undefined;
    const l: Line = { id: ++nextId, ctx, at: 0, sources: [], done: false, started: false, onStart,
      finish: how => { if (settled) return; settled = true; clearTimeout(timer); if (line === l) line = null; res(how); },
      // A hard stop: until the first sound, 5 s (then the browser voice takes over); after that, 6 s past the end of
      // what's scheduled. A stalled generation or an audio device that never fires "ended" can't hold the show.
      deadline: () => {
        clearTimeout(timer);
        const ms = l.started ? (l.at - l.ctx.currentTime) * 1000 + 6000 : 5000;
        timer = setTimeout(() => {
          if (l.started) { stopLine(l); l.finish("cancelled"); return; }
          stopLine(l); l.finish("fallback");
          if (++misses >= 2) { console.warn("[voice] too slow on this device, using the browser voice"); fail(); }
        }, ms);
      } };
    line = l;
    l.deadline();
    worker!.postMessage({ type: "speak", id: l.id, text, voice, speed });
  });
}

/** Silences a line and tells the worker to stop generating the rest of it. */
function stopLine(l: Line): void {
  if (line === l) line = null;
  for (const s of l.sources) { s.onended = null; try { s.stop(); } catch { /* already stopped */ } }
  worker?.postMessage({ type: "cancel" });
}

export function stopNeural(): void {
  const l = line;
  if (!l) return;
  stopLine(l);
  l.finish("cancelled");
}

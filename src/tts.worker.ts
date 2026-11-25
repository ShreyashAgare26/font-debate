// Runs the Kokoro speech model off the main thread, so generating a line never stalls the 3D scene.
// Lines are generated one at a time; a newer request makes the one in progress stop at its next sentence.
import { KokoroTTS } from "kokoro-js";

type In = { type: "load"; device?: "wasm" | "webgpu"; dtype?: "q8" | "fp16" | "fp32" } | { type: "speak"; id: number; text: string; voice: string; speed: number };

let model: KokoroTTS | null = null;
let latest = 0;
let queue: Promise<void> = Promise.resolve();

async function load(device: "wasm" | "webgpu" = "webgpu", dtype: "q8" | "fp16" | "fp32" = "fp32"): Promise<void> {
  try {
    // Report download progress across all the model's files as one percentage
    const files = new Map<string, [number, number]>();
    let lastPct = -1;
    const progress_callback = (p: { status: string; file?: string; loaded?: number; total?: number }) => {
      if (p.status !== "progress" || !p.file || !p.total) return;
      files.set(p.file, [p.loaded ?? 0, p.total]);
      let loaded = 0, total = 0;
      for (const [l, t] of files.values()) { loaded += l; total += t; }
      const pct = Math.floor((loaded / total) * 100);
      if (pct !== lastPct) { lastPct = pct; postMessage({ type: "progress", pct }); }
    };
    model = await KokoroTTS.from_pretrained("onnx-community/Kokoro-82M-v1.0-ONNX", { dtype, device, progress_callback: progress_callback as never });
    // The first generation compiles the GPU shaders (~3 s); do it now so the first real line starts quickly
    await model.generate("Order.", { voice: "af_bella" as never });
    postMessage({ type: "ready" });
  } catch (err) {
    postMessage({ type: "error", message: String(err) });
  }
}

async function speak(m: Extract<In, { type: "speak" }>): Promise<void> {
  if (!model || m.id !== latest) return postMessage({ type: "done", id: m.id });
  try {
    // Sentence by sentence: the first one plays while the rest are still being generated.
    // (kokoro-js's own stream() stalls after the first sentence when given a plain string, so we split here.)
    for (const sentence of m.text.match(/[^.!?]+[.!?]*["”']?\s*/g) ?? [m.text]) {
      if (m.id !== latest) break;
      if (!sentence.trim()) continue;
      const audio = await model.generate(sentence.trim(), { voice: m.voice as never, speed: m.speed });
      if (m.id !== latest) break;
      const data = audio.audio as Float32Array;
      postMessage({ type: "chunk", id: m.id, data, rate: audio.sampling_rate }, { transfer: [data.buffer] });
    }
  } catch { /* the main thread falls back to the browser voice if nothing arrives */ }
  postMessage({ type: "done", id: m.id });
}

self.onmessage = (e: MessageEvent<In>) => {
  const m = e.data;
  if (m.type === "load") { void load(m.device, m.dtype); return; }
  latest = m.id;
  queue = queue.then(() => speak(m));
};

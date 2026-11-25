// Sound effects (synthesised, no files) and voices: natural Kokoro voices when they have loaded, the browser's built-in speech until then.
import type { Kind } from "./logic";
import { forSpeech, neural, speakNeural, stopNeural } from "./tts";
import { store } from "./util";

type AudioCtor = typeof AudioContext;
let ac: AudioContext | null = null, noise: AudioBuffer | null = null;
let muted = store.get("muted", false);

function ctx(): AudioContext {
  if (!ac) {
    const Ctor: AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext: AudioCtor }).webkitAudioContext;
    ac = new Ctor();
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ac.state === "suspended") void ac.resume();
  return ac;
}
function envelope(g: GainNode, t: number, attack: number, peak: number, dur: number): void {
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
function noiseHit(type: BiquadFilterType, f0: number, f1: number, dur: number, peak: number, q = 1): void {
  const a = ctx(), t = a.currentTime, s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  s.buffer = noise; s.loop = true; f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  envelope(g, t, 0.02, peak, dur); s.connect(f).connect(g).connect(a.destination); s.start(t); s.stop(t + dur + 0.05);
}
function tone(f0: number, f1: number, dur: number, peak: number, type: OscillatorType = "sine", delay = 0): void {
  const a = ctx(), t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  envelope(g, t, 0.005, peak, dur); o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.05);
}
/** Wraps a sound so it respects mute and can never break the game if audio is unavailable. */
const play = <A extends unknown[]>(fn: (...a: A) => void) => (...a: A): void => {
  if (muted) return;
  try { fn(...a); } catch { /* audio is decoration */ }
};

export const sfx = {
  /** Browsers only allow audio after a click; call this from one. */
  unlock(): void { try { ctx(); } catch { /* no audio available */ } },
  get muted(): boolean { return muted; },
  toggle(): boolean { muted = !muted; store.set("muted", muted); return muted; },
  whoosh: play(() => noiseHit("bandpass", 300, 2400, 0.28, 0.35, 0.8)),
  impact: play((power: number) => { tone(160, 38, 0.32, 0.7 + power * 0.25); noiseHit("lowpass", 2400, 300, 0.16, 0.5); }),
  ko: play(() => { tone(120, 28, 1.1, 0.95); noiseHit("lowpass", 1800, 120, 0.9, 0.6); noiseHit("bandpass", 600, 1400, 1.8, 0.25, 0.4); }),
  cheer: play((len: number = 1.2) => noiseHit("bandpass", 700, 1500, len, 0.18, 0.5)),
  bell: play(() => { tone(880, 870, 1.1, 0.25, "triangle"); tone(1320, 1310, 0.9, 0.12, "sine", 0.01); }),
  pop: play(() => tone(520, 900, 0.09, 0.15, "triangle")),
  fanfare: play(() => [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.5, 0.18, "triangle", i * 0.12))),
};

/* ---------- Voices ---------- */
/** Anything that can speak a line: a fighter, or the stage partner. */
export interface Speaker { cat: Kind; slot: number; talking: boolean }

const synth: SpeechSynthesis | undefined = window.speechSynthesis;
let voices: SpeechSynthesisVoice[] = [];
const loadVoices = () => { voices = synth ? synth.getVoices().filter(v => /^en/i.test(v.lang)) : []; };
if (synth) { loadVoices(); synth.addEventListener?.("voiceschanged", loadVoices); }

// macOS ships joke voices (Bells, Zarvox, Bad News...). Keep them out of the cast.
const NOVELTY = /Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Organ|Pipe|Superstar|Trinoids|Whisper|Wobble|Zarvox|Junior|Ralph|Fred|Kathy|Princess|Grandma|Grandpa|Eddy|Flo|Reed|Rocko|Sandy|Shelley/i;
const PREFER = ["Samantha", "Daniel", "Karen", "Moira", "Alex", "Tessa", "Rishi", "Google US English", "Google UK English Male", "Google UK English Female", "Microsoft"];
function cast(): SpeechSynthesisVoice[] {
  const ok = voices.filter(v => !NOVELTY.test(v.name)), pool = ok.length ? ok : voices;
  const preferred = PREFER.map(n => pool.find(v => v.name.includes(n))).filter((v): v is SpeechSynthesisVoice => v !== undefined);
  return [...new Set([...preferred, ...pool])];
}
// Each font category speaks in character
const STYLE: Record<Kind, { pitch: number; rate: number }> = {
  Sans: { pitch: 1.05, rate: 1.06 }, Serif: { pitch: 0.8, rate: 0.95 }, Mono: { pitch: 0.55, rate: 1.1 }, Display: { pitch: 0.7, rate: 0.92 }, Hand: { pitch: 1.45, rate: 1.05 },
};
const NARRATOR = { pitch: 1, rate: 1.1 };

// Each font category in Kokoro voices that suit it (Serif British and grand, Mono flat and precise, Display big,
// Hand light). Three per category, picked by corner, so two fonts of the same kind never share a voice.
const KOKORO: Record<Kind, string[]> = {
  Sans: ["af_bella", "am_eric", "af_sarah"], Serif: ["bm_george", "bf_emma", "bm_lewis"], Mono: ["am_michael", "am_echo", "af_kore"],
  Display: ["am_fenrir", "af_nova", "am_onyx"], Hand: ["af_nicole", "af_sky", "am_puck"],
};
const KOKORO_ANNOUNCER = "am_liam";

export const voice = {
  get on(): boolean { return !muted && (neural.ready || (!!synth && voices.length > 0)); },
  stop(): void { stopNeural(); synth?.cancel(); },
  /** Speaks a line in the speaker's voice (or the announcer's). Resolves when it has been spoken, or at once when voices are off. */
  async speak(speaker: Speaker | null, line: string): Promise<void> {
    if (!this.on) return;
    const text = forSpeech(line);
    if (neural.ready) {
      synth?.cancel();
      const list = speaker ? KOKORO[speaker.cat] : [KOKORO_ANNOUNCER], style = speaker ? STYLE[speaker.cat] : NARRATOR;
      let how: Awaited<ReturnType<typeof speakNeural>> = "fallback";
      try { how = await speakNeural(text, list[(speaker?.slot ?? 0) % list.length], style.rate, ctx()); } catch { /* fall through to the browser voice */ }
      if (how !== "fallback") { if (speaker) speaker.talking = false; return; }
    }
    return this.speakBrowser(speaker, text);
  },
  speakBrowser(speaker: Speaker | null, text: string): Promise<void> {
    return new Promise(res => {
      if (!synth || voices.length === 0) { if (speaker) speaker.talking = false; return res(); }
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text), all = cast(), style = speaker ? STYLE[speaker.cat] : NARRATOR;
      const pick = all[(speaker ? speaker.slot + 1 : 0) % all.length];
      try { u.voice = pick; } catch { /* keep the browser's default voice */ }
      u.pitch = style.pitch; u.rate = style.rate;
      let done = false;
      const end = () => { if (done) return; done = true; clearTimeout(net); if (speaker) speaker.talking = false; res(); };
      const net = setTimeout(end, 2000 + text.length * 95); // some browsers never fire "end"
      u.onend = u.onerror = end;
      synth.speak(u);
    });
  },
};

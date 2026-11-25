// Game time: tweens run on a clock we can freeze (hit-stop), slow (slow motion) or hurry (the Faster button).
import { RM, sleep } from "./util";

export const time = {
  /** 1 = normal, 0 = frozen, 0.25 = slow motion. */
  scale: 1,
  /** The player asked to hurry the rest of this round. */
  rush: false,
};
interface Tween { t: number; ms: number; fn: (t: number) => void; res: () => void }
const tweens: Tween[] = [];

/** Runs `fn` with t from 0 to 1 over `ms` of game time. */
export function gtween(ms: number, fn: (t: number) => void): Promise<void> {
  return new Promise(res => { fn(0); tweens.push({ t: 0, ms, fn, res }); });
}
export function stepTweens(gameMs: number): void {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i];
    tw.t = Math.min(tw.ms, tw.t + gameMs); tw.fn(tw.t / tw.ms);
    if (tw.t >= tw.ms) { tweens.splice(i, 1); tw.res(); }
  }
}
/** A reading pause in real time; hurrying the round shortens it. */
export const wait = (ms: number) => sleep(time.rush ? Math.min(ms, 180) : ms);
export async function hitStop(ms: number): Promise<void> { if (RM) return; time.scale = 0; await sleep(ms); time.scale = 1; }
export function slowMo(scale: number, ms: number): void {
  if (RM) return;
  time.scale = scale;
  setTimeout(() => { if (time.scale === scale) time.scale = 1; }, ms);
}

// Camera direction. Moves are timed in real milliseconds, so they land on schedule no matter the frame rate.
import * as THREE from "three";
import { app } from "./app";
import type { Fighter } from "./characters";
import { camera, view } from "./scene";
import { RM, ease, sleep } from "./util";

/** A continuous move around a point: a full orbit, or a gentle sway when `sway` (radians) is set. */
export interface Orbit { at: THREE.Vector3; r: number; h: number; lookY: number; speed: number; a: number; sway?: number }
export const cam = {
  pos: new THREE.Vector3(0, 9, 22), look: new THREE.Vector3(0, 2, 0), curLook: new THREE.Vector3(0, 2, 0),
  fromPos: new THREE.Vector3(), fromLook: new THREE.Vector3(), t0: 0, dur: 0,
  orbit: null as Orbit | null, shake: 0, fov: 50,
};
export interface ShotOptions { cut?: boolean; fov?: number; dur?: number; labels?: boolean }

/** Floating name labels only read well in wide shots. */
export const showLabels = (on: boolean): void => { app.match?.fighters.forEach(f => { f.label.visible = on; }); };

export function shot(pos: THREE.Vector3, look: THREE.Vector3, { cut = false, fov = 50, dur = 650, labels = false }: ShotOptions = {}): void {
  cam.orbit = null; cam.fromPos.copy(camera.position); cam.fromLook.copy(cam.curLook);
  cam.pos.copy(pos); cam.look.copy(look); cam.fov = fov; cam.t0 = performance.now(); cam.dur = cut || RM ? 0 : dur;
  showLabels(labels);
}
/** Resolves when the current camera move has landed. */
export const camArrived = () => sleep(Math.max(0, cam.t0 + cam.dur - performance.now()) + 60);

export const shotWide = (o: ShotOptions = {}) => shot(new THREE.Vector3(0, 6, 15.5), new THREE.Vector3(0, 2.8, -0.2), { labels: true, ...o });
export const shotLineup = () => shot(new THREE.Vector3(0, 5, 13), new THREE.Vector3(0, 2.6, -0.4), { labels: true, dur: 900 });
/** The speaker fills the frame; close enough that the neighbours fall outside it instead of looming in the foreground. */
export function shotOn(ch: Fighter, o: ShotOptions = {}): void {
  const p = ch.root.position;
  shot(new THREE.Vector3(p.x * 0.92, 4, p.z + 6.6), new THREE.Vector3(p.x, 2.7, p.z), { fov: 40, ...o });
}
// Attack shots always film from the open front of the arena, never through the third fighter
function frontSide(dir: THREE.Vector3): THREE.Vector3 { const side = new THREE.Vector3(-dir.z, 0, dir.x); return side.z < 0 ? side.negate() : side; }
export function shotOverShoulder(att: Fighter, def: Fighter): void {
  const a = att.root.position, d = def.root.position, dir = d.clone().sub(a).setY(0).normalize(), side = frontSide(dir);
  shot(a.clone().addScaledVector(dir, -4.4).addScaledVector(side, 3).setY(4), d.clone().setY(2.5), { cut: true, fov: 46 });
}
export function shotImpact(def: Fighter, att: Fighter): void {
  const d = def.root.position, dir = d.clone().sub(att.root.position).setY(0).normalize(), side = frontSide(dir);
  shot(d.clone().addScaledVector(side, 5.2).addScaledVector(dir, 1.2).setY(3), d.clone().setY(2.4), { cut: true, fov: RM ? 50 : 36 });
}
/** Slow orbit of the empty arena, behind the brief form. */
export function camIdle(): void { cam.orbit = { at: new THREE.Vector3(0, 0, 0), r: 22, h: 9, lookY: 2, speed: 0.06, a: 0 }; }

export function updateCamera(dt: number, now: number): void {
  if (cam.orbit) {
    const o = cam.orbit; o.a += dt * o.speed;
    const a = o.sway ? Math.sin(o.a) * o.sway : o.a;
    cam.pos.set(o.at.x + Math.sin(a) * o.r, o.h, o.at.z + Math.cos(a) * o.r); cam.look.copy(o.at).setY(o.lookY);
    const k = Math.min(1, dt * 3); camera.position.lerp(cam.pos, k); cam.curLook.lerp(cam.look, k);
  } else {
    const t = cam.dur ? Math.min(1, (now - cam.t0) / cam.dur) : 1, k = ease(t);
    camera.position.lerpVectors(cam.fromPos, cam.pos, k); cam.curLook.lerpVectors(cam.fromLook, cam.look, k);
  }
  // Shots are composed for widescreen. On narrow screens, and when panels cover part of the height, widen the field of view until the shot fits.
  const BASE_ASPECT = 1.6, widen = Math.max(1, BASE_ASPECT / camera.aspect) / Math.sqrt(view.freeFrac);
  const want = Math.min(110, (2 * Math.atan(Math.tan((cam.fov * Math.PI) / 360) * widen) * 180) / Math.PI);
  if (Math.abs(camera.fov - want) > 0.05) { camera.fov += (want - camera.fov) * Math.min(1, dt * 5); camera.updateProjectionMatrix(); }
  cam.shake = Math.max(0, cam.shake - dt * 2.2);
  if (cam.shake && !RM) camera.position.add(new THREE.Vector3((Math.random() - 0.5) * cam.shake, (Math.random() - 0.5) * cam.shake, (Math.random() - 0.5) * cam.shake * 0.5));
  camera.lookAt(cam.curLook);
}

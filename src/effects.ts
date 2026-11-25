// Hit effects: flying letters, damage numbers, shockwaves, stars, confetti, screen flash and letterbox bars.
import * as THREE from "three";
import type { Fighter } from "./characters";
import type { Font } from "./logic";
import { canvasTex, glyphTexture, scene } from "./scene";
import { gtween } from "./time";
import { $, RM, SLOT, easeOut, sleep } from "./util";

interface Particle { v: THREE.Vector3; life: number; g: number; spin?: number }
type FxSprite = THREE.Sprite & { userData: Particle };
const sprites: FxSprite[] = [];
function spriteFx(map: THREE.Texture, pos: THREE.Vector3, scale: number, data: Particle): FxSprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false })) as FxSprite;
  s.position.copy(pos); s.scale.setScalar(scale); s.userData = data; scene.add(s); sprites.push(s);
  return s;
}
/** Letters of the product name, in the attacker's font, fly off the defender. */
export function debris(at: THREE.Vector3, attacker: Fighter, productName: string, n = 14): void {
  const letters = (productName.replace(/\s/g, "") || "Aa") + "Aa&?!";
  for (let i = 0; i < n; i++) {
    spriteFx(glyphTexture(attacker.name, letters[i % letters.length], i % 3 ? attacker.color : "#fffefa"), at.clone().setY(at.y + 1.6 + Math.random()), 0.7 + Math.random() * 0.5,
      { v: new THREE.Vector3((Math.random() - 0.5) * 9, Math.random() * 7 + 3, (Math.random() - 0.5) * 9), life: 1.1, g: 16, spin: (Math.random() - 0.5) * 10 });
  }
}
export function damageNumber(at: THREE.Vector3, dmg: number): void {
  const { x, t } = canvasTex(256, 128);
  if ("fontStretch" in x) (x as CanvasRenderingContext2D & { fontStretch: string }).fontStretch = "condensed";
  x.font = `900 100px "Archivo", sans-serif`; x.textAlign = "center"; x.textBaseline = "middle"; x.lineJoin = "round";
  x.lineWidth = 14; x.strokeStyle = "#070a14"; x.strokeText("−" + dmg, 128, 66); x.fillStyle = "#ff4a3d"; x.fillText("−" + dmg, 128, 66);
  spriteFx(t, at.clone().setY(at.y + 3.4), 1, { v: new THREE.Vector3(0, 1.6, 0), life: 1.3, g: 0 }).scale.set(2.2, 1.1, 1);
}
export function shockwave(at: THREE.Vector3, color: string): void {
  const material = new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.05, 40), material);
  ring.rotation.x = -Math.PI / 2; ring.position.copy(at).setY(0.78); scene.add(ring);
  void gtween(500, t => { ring.scale.setScalar(0.4 + easeOut(t) * 4.5); material.opacity = 1 - t; }).then(() => scene.remove(ring));
}
const STAR_TEX = (() => {
  const { x, t } = canvasTex(64, 64);
  x.translate(32, 32); x.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 12 : 28, a = (i * Math.PI) / 5 - Math.PI / 2; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  x.closePath(); x.fillStyle = "#f2c14e"; x.fill(); x.lineWidth = 4; x.strokeStyle = "#16181d"; x.stroke();
  return t;
})();
/** Dizzy stars circling a knocked-out fighter. */
export function addStars(ch: Fighter): void {
  ch.stars = [0, 1, 2].map(() => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: STAR_TEX, transparent: true, depthWrite: false }));
    s.scale.setScalar(0.45); ch.root.add(s);
    return s;
  });
}
/** Letter confetti in the winner's font and the three corner colours. */
export function confetti(f: Pick<Font, "name">): void {
  const colours = [...SLOT, "#e0261c", "#fffefa"];
  for (let i = 0; i < 160; i++) {
    spriteFx(glyphTexture(f.name, "Aa&gR?!"[i % 7], colours[i % colours.length]), new THREE.Vector3((Math.random() - 0.5) * 24, 12 + Math.random() * 12, (Math.random() - 0.5) * 18), 0.6 + Math.random() * 0.6,
      { v: new THREE.Vector3((Math.random() - 0.5) * 1.5, -2 - Math.random() * 2, 0), life: 7, g: 0, spin: (Math.random() - 0.5) * 4 });
  }
}
export function updateSprites(gdt: number): void {
  for (let i = sprites.length - 1; i >= 0; i--) {
    const s = sprites[i], u = s.userData;
    u.v.y -= u.g * gdt; s.position.addScaledVector(u.v, gdt); u.life -= gdt;
    if (u.spin) s.material.rotation += u.spin * gdt;
    s.material.opacity = Math.min(1, u.life * 2);
    if (u.life <= 0) { scene.remove(s); s.material.dispose(); sprites.splice(i, 1); }
  }
}
export async function flashScreen(strength = 0.85): Promise<void> {
  if (RM) return;
  const f = $("flash");
  f.style.transition = "none"; f.style.opacity = String(strength);
  await sleep(40);
  f.style.transition = "opacity .35s"; f.style.opacity = "0";
}
/** Cinematic black bars; the HUD compacts while they are on. */
export const letterbox = (on: boolean): void => { document.body.classList.toggle("cine", on && !RM); };

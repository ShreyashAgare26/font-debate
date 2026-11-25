// The contenders: vinyl-toy characters built from each font's real metadata, with canvas-drawn faces and posed arms.
import * as THREE from "three";
import type { Contender } from "./logic";
import { canvasTex, fitPx, mesh, rr, scene, smooth, type CanvasTex } from "./scene";
import { fam } from "./util";

export type Mood = "idle" | "smug" | "angry" | "hurt" | "ko" | "happy";
interface Arm { sh: THREE.Group; el: THREE.Group; sx: number; /** current [swing out, swing forward, elbow bend] */ cur: [number, number, number] }
interface Extras {
  tip?: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
  cursor?: THREE.Mesh;
  cape?: THREE.Mesh;
  capeBase?: ArrayLike<number>;
}
/** What a character is built from: a font in a match, its corner colour and where it stands. */
export interface FighterSeed extends Contender { color: string; slot: number; home: THREE.Vector3 }
/** A font on stage. `root.position.y` is height above its podium; `lift` carries the body at podium height. */
export interface Fighter extends FighterSeed {
  root: THREE.Group; lift: THREE.Group; rig: THREE.Group; body: THREE.Group; torso: THREE.Group; blob: THREE.Mesh;
  arms: Arm[]; legs: THREE.Group[];
  face: CanvasTex; faceMat: THREE.MeshStandardMaterial; label: THREE.Sprite; extras: Extras;
  /** Standing height (feet to top of body) and body width. */
  H: number; W: number;
  mood: Mood; blink: boolean; mouthOpen: boolean; talking: boolean;
  t: number; nextBlink: number;
  /** Facing: current target, the resting direction, and who it is watching. */
  yaw: number; homeYaw: number | null; lookAt: Fighter | null; lockYaw: boolean;
  /** -1..0 winding up, 0..1 punching. */
  punch: number;
  stars: THREE.Sprite[] | null;
  podium?: THREE.Group; spot?: THREE.SpotLight;
}

/** Everything that belongs to one match (podiums, fighters, lights). Cleared between matches. */
export const stage = new THREE.Group(); scene.add(stage);
// Middle podium sits further back so side-to-side attacks have a clear lane in front of it
export const HOME = [new THREE.Vector3(-5.2, 0, 1.2), new THREE.Vector3(0, 0, -2.6), new THREE.Vector3(5.2, 0, 1.2)];
export const CENTER = new THREE.Vector3(0, 0, 2.2);
const INK = 0x16181d;

// A vinyl-toy build: rounded body in the corner colour, an ink outline, a paper face panel, jointed arms.
// Body proportions come from the font's real metadata: width, stroke thickness, slant.
const OUTLINE = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
export const LEG_H = 0.5, PODIUM_TOP = 0.73, LYING = 0.4; // LYING: body half-depth, so a knocked-out fighter rests on a surface, not in it
function roundedBox(W: number, H: number, D: number, r: number, slant: number): THREE.ExtrudeGeometry {
  const b = 0.07, w = W - b * 2, h = H - b * 2, x = -w / 2, y = -h / 2, s = new THREE.Shape();
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ExtrudeGeometry(s, { depth: D - b * 2, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 5, curveSegments: 10 });
  g.translate(0, 0, -(D - b * 2) / 2);
  if (slant) g.applyMatrix4(shearX(slant));
  g.computeVertexNormals();
  return g;
}
const shearX = (k: number) => new THREE.Matrix4().set(1, k, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
// Ink outline: the same shape, slightly larger, drawn inside-out
function outlined(geo: THREE.BufferGeometry, material: THREE.Material, grow = 1.05): THREE.Group {
  const g = new THREE.Group(), m = mesh(geo, material), o = new THREE.Mesh(geo, OUTLINE);
  o.scale.setScalar(grow); g.add(o, m); g.userData.main = m; return g;
}
export function buildCharacter(ch: FighterSeed): Fighter {
  const W = 1.4 + ((ch.width || 6) - 6) * 0.07, tall = ch.cat === "Display" || (ch.width && ch.width <= 4);
  const H = tall ? 2.2 : 1.85, D = 0.7 + ((ch.thick || 5) - 5) * 0.05, slant = ch.cat === "Hand" ? 0.18 : 0;
  const root = new THREE.Group(), rig = new THREE.Group(), body = new THREE.Group(), torso = new THREE.Group();
  const lift = new THREE.Group(); lift.position.y = PODIUM_TOP;
  root.add(lift); lift.add(rig); rig.add(body);
  const mono = ch.cat === "Mono";
  const skin = smooth(mono ? 0x1b2333 : ch.color), dark = smooth(INK, { roughness: 0.6 }), glove = smooth(0xfaf7ef, { roughness: 0.55 }), trim = smooth(ch.color, { emissive: ch.color, emissiveIntensity: 0.25 });
  const topY = LEG_H + H, lean = (y: number) => slant * (y - (LEG_H + H / 2)); // x offset of the slanted body at height y

  // Torso: rounded slab + outline + face panel
  const shell = outlined(roundedBox(W, H, D, 0.2, slant), skin, 1.045);
  const face = canvasTex(512, Math.round(512 * H / W));
  const faceMat = new THREE.MeshStandardMaterial({ map: face.t, transparent: true, roughness: 0.75 });
  const panelGeo = new THREE.PlaneGeometry(W * 0.84, H * 0.84); if (slant) panelGeo.applyMatrix4(shearX(slant));
  const panel = new THREE.Mesh(panelGeo, faceMat); panel.position.z = D / 2 + 0.012; panel.receiveShadow = false;
  torso.add(shell, panel); torso.position.y = LEG_H + H / 2; body.add(torso);
  shell.userData.main.receiveShadow = false;

  // Legs with rounded shoes
  const legs: THREE.Group[] = [];
  for (const sx of [-1, 1]) {
    const leg = new THREE.Group(); leg.position.set(sx * W * 0.24 + lean(LEG_H), LEG_H + 0.04, 0);
    const shin = mesh(new THREE.CylinderGeometry(0.1, 0.085, 0.4, 10), dark); shin.position.y = -0.2;
    const shoe = outlined(new THREE.SphereGeometry(0.27, 16, 12), ch.cat === "Serif" ? trim : glove, 1.07);
    shoe.scale.set(ch.cat === "Serif" ? 1.35 : 1, 0.55, 1.5); shoe.position.set(0, -0.4, 0.1);
    leg.add(shin, shoe); body.add(leg); legs.push(leg);
  }

  // Jointed arms: shoulder -> elbow -> mitten
  const arms: Arm[] = [];
  for (const sx of [-1, 1]) {
    const yS = LEG_H + H * 0.6, sh = new THREE.Group(), el = new THREE.Group();
    sh.position.set(sx * (W / 2 - 0.02) + lean(yS), yS, 0);
    const upperGeo = new THREE.CylinderGeometry(0.09, 0.085, 0.42, 10); upperGeo.translate(0, -0.21, 0);
    const foreGeo = new THREE.CylinderGeometry(0.085, 0.075, 0.38, 10); foreGeo.translate(0, -0.19, 0);
    const elbow = mesh(new THREE.SphereGeometry(0.095, 10, 8), dark);
    const cuff = mesh(new THREE.TorusGeometry(0.1, 0.045, 8, 16), trim, false); cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.36;
    const hand = outlined(new THREE.SphereGeometry(0.2, 16, 12), glove, 1.08); hand.scale.set(1, 0.95, 0.85); hand.position.y = -0.52;
    const thumb = mesh(new THREE.SphereGeometry(0.085, 10, 8), glove); thumb.position.set(-sx * 0.15, -0.46, 0.08);
    el.position.y = -0.42; el.add(elbow, mesh(foreGeo, dark), cuff, hand, thumb);
    sh.add(mesh(upperGeo, dark), el); body.add(sh);
    arms.push({ sh, el, sx, cur: [sx * 0.4, 0, -0.3] });
  }

  // Category accessories
  const extras: Extras = {}, headX = lean(topY);
  if (ch.cat === "Serif") { // top hat
    const hat = new THREE.Group();
    const brim = outlined(new THREE.CylinderGeometry(0.66, 0.66, 0.07, 28), dark, 1.04), crown = outlined(new THREE.CylinderGeometry(0.42, 0.45, 0.66, 28), dark, 1.04), band = mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.13, 28), trim, false);
    brim.position.y = 0.03; crown.position.y = 0.38; band.position.y = 0.14; hat.add(brim, crown, band);
    hat.position.set(headX, topY, 0); hat.rotation.z = -0.08; body.add(hat);
  }
  if (ch.cat === "Sans") {
    const ant = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 8), dark); ant.position.set(headX, topY + 0.27, 0);
    const tip = mesh(new THREE.SphereGeometry(0.15, 16, 12), smooth(ch.color, { emissive: ch.color, emissiveIntensity: 0.9 }), false); tip.position.set(headX, topY + 0.62, 0);
    body.add(ant, tip); extras.tip = tip;
  }
  if (mono) {
    const cur = mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), smooth(0x7cfc9a, { emissive: 0x7cfc9a, emissiveIntensity: 1 }), false); cur.position.set(0, topY + 0.32, 0); body.add(cur); extras.cursor = cur;
    for (const sx of [-1, 1]) { const vent = mesh(new THREE.BoxGeometry(0.04, H * 0.5, D * 0.5), trim, false); vent.position.set(sx * (W / 2 + 0.005), LEG_H + H / 2, 0); body.add(vent); }
  }
  if (ch.cat === "Display") {
    const crown = new THREE.Group(), gold = smooth(0xf2c14e, { metalness: 0.55, roughness: 0.3 });
    const ring = mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.22, 24, 1, true), gold); ring.material.side = THREE.DoubleSide; ring.position.y = 0.11; crown.add(ring);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, s = mesh(new THREE.ConeGeometry(0.12, 0.34, 12), gold), gem = mesh(new THREE.SphereGeometry(0.05, 8, 6), trim, false); s.position.set(Math.sin(a) * 0.45, 0.38, Math.cos(a) * 0.45); gem.position.set(Math.sin(a) * 0.5, 0.12, Math.cos(a) * 0.5); crown.add(s, gem); }
    crown.position.y = topY - 0.02; body.add(crown);
    const cape = mesh(new THREE.PlaneGeometry(W * 1.1, H * 0.95, 4, 8), smooth(new THREE.Color(ch.color).multiplyScalar(0.55), { side: THREE.DoubleSide, roughness: 0.7 }));
    cape.position.set(0, LEG_H + H * 0.5, -D / 2 - 0.06); body.add(cape); extras.cape = cape; extras.capeBase = Array.from((cape.geometry.attributes.position as THREE.BufferAttribute).array);
  }
  if (ch.cat === "Hand") {
    const scarf = mesh(new THREE.TorusGeometry(W * 0.44, 0.12, 10, 24), glove); scarf.rotation.x = Math.PI / 2; scarf.scale.y = (D + 0.2) / (W * 0.88); scarf.position.set(lean(topY - 0.25), topY - 0.25, 0); body.add(scarf);
    const tail = mesh(new THREE.BoxGeometry(0.22, 0.6, 0.06), glove); tail.position.set(lean(topY - 0.5) + W * 0.3, topY - 0.55, D / 2 + 0.08); tail.rotation.z = 0.2; body.add(tail);
    const quill = mesh(new THREE.ConeGeometry(0.1, 1, 8), glove); quill.position.set(headX + W * 0.32, topY + 0.38, -0.1); quill.rotation.z = -0.6; body.add(quill);
  }

  // Name label floating above, set in the font itself
  const lab = canvasTex(512, 128);
  lab.x.font = `700 ${fitPx(lab.x, ch.name, 700, fam(ch), 470, 70)}px ${fam(ch)}`; lab.x.textAlign = "center"; lab.x.textBaseline = "middle";
  lab.x.lineWidth = 10; lab.x.strokeStyle = "#070a14"; lab.x.lineJoin = "round"; lab.x.strokeText(ch.name, 256, 66); lab.x.fillStyle = "#f3f5fa"; lab.x.fillText(ch.name, 256, 66);
  const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: lab.t, transparent: true, depthWrite: false }));
  label.scale.set(3, 0.75, 1); label.position.y = PODIUM_TOP + topY + 1.3; root.add(label);
  // Contact shadow
  const blob = new THREE.Mesh(new THREE.CircleGeometry(W * 0.7, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }));
  blob.rotation.x = -Math.PI / 2; blob.position.y = PODIUM_TOP + 0.03; root.add(blob);
  const fighter: Fighter = { ...ch, root, lift, blob, rig, body, torso, arms, legs, face, faceMat, label, extras, H: topY, W,
    mood: "idle", blink: false, mouthOpen: false, talking: false, t: Math.random() * 10, nextBlink: 1 + Math.random() * 3,
    yaw: 0, homeYaw: null, lookAt: null, lockYaw: false, punch: 0, stars: null };
  drawFace(fighter);
  return fighter;
}

export function drawFace(ch: Fighter): void {
  const { x, c, t } = ch.face, W = c.width, H = c.height, mono = ch.cat === "Mono";
  const ink = mono ? "#7cfc9a" : "#16181d", bg = mono ? "#0c1f15" : "#fffefa";
  x.clearRect(0, 0, W, H);
  rr(x, 6, 6, W - 12, H - 12, 46); x.fillStyle = bg; x.fill();
  x.lineWidth = 10; x.strokeStyle = mono ? "#1d3a2a" : "#16181d"; x.stroke();
  const ey = H * 0.22, ex = [W * 0.31, W * 0.69], r = W * 0.095, my = H * 0.39, look = 0;
  x.lineCap = "round"; x.lineJoin = "round"; x.lineWidth = 13; x.strokeStyle = ink; x.fillStyle = ink;
  const mood = ch.mood, closed = ch.blink && !["ko", "happy", "hurt"].includes(mood);
  if (mood === "happy" && !mono) { x.fillStyle = "rgba(255,120,130,.45)"; for (const cx of ex) { x.beginPath(); x.ellipse(cx + (cx < W / 2 ? -r * 0.9 : r * 0.9), ey + r * 1.5, r * 0.7, r * 0.42, 0, 0, Math.PI * 2); x.fill(); } x.fillStyle = ink; }
  for (const [i, cx] of ex.entries()) {
    const s = i ? 1 : -1;
    if (mood === "ko") { x.beginPath(); x.moveTo(cx - r, ey - r); x.lineTo(cx + r, ey + r); x.moveTo(cx + r, ey - r); x.lineTo(cx - r, ey + r); x.stroke(); continue; }
    if (mood === "happy") { x.beginPath(); x.arc(cx, ey + r * 0.45, r, Math.PI * 1.12, Math.PI * 1.88); x.stroke(); continue; }
    if (mood === "hurt") { x.beginPath(); x.moveTo(cx - s * r, ey - r * 0.7); x.lineTo(cx + s * r * 0.6, ey); x.lineTo(cx - s * r, ey + r * 0.7); x.stroke(); continue; }
    if (closed) { x.beginPath(); x.moveTo(cx - r, ey); x.quadraticCurveTo(cx, ey + r * 0.35, cx + r, ey); x.stroke(); continue; }
    if (mono) { rr(x, cx - r * 0.7, ey - r, r * 1.4, r * 2, 8); x.fill(); }
    else {
      x.beginPath(); x.arc(cx, ey, r, 0, Math.PI * 2); x.fillStyle = "#fff"; x.fill(); x.stroke();
      const px = cx + look * r * 0.4, py = ey + r * 0.08;
      x.beginPath(); x.arc(px, py, r * 0.52, 0, Math.PI * 2); x.fillStyle = ink; x.fill();
      x.beginPath(); x.arc(px - r * 0.18, py - r * 0.2, r * 0.16, 0, Math.PI * 2); x.fillStyle = "#fff"; x.fill(); // catchlight
      if (mood === "smug" || mood === "angry") { x.fillStyle = bg; x.beginPath(); if (mood === "smug") x.rect(cx - r - 9, ey - r - 9, r * 2 + 18, r * 0.95); else { x.moveTo(cx - r - 9, ey - r - 9); x.lineTo(cx + r + 9, ey - r - 9); x.lineTo(cx + r + 9, ey - r * (s > 0 ? 0.75 : 0.05)); x.lineTo(cx - r - 9, ey - r * (s > 0 ? 0.05 : 0.75)); } x.fill();
        x.beginPath(); if (mood === "smug") { x.moveTo(cx - r, ey - r * 0.12); x.lineTo(cx + r, ey - r * 0.12); } else { x.moveTo(cx - r, ey - r * (s > 0 ? 0.05 : 0.75)); x.lineTo(cx + r, ey - r * (s > 0 ? 0.75 : 0.05)); } x.stroke(); }
    }
    x.fillStyle = ink;
    x.beginPath(); // brows
    if (mood === "angry") { x.moveTo(cx - s * r * 1.15, ey - r * 1.75); x.lineTo(cx + s * r * 0.9, ey - r * 1.2); }
    else if (mood === "smug" && i === 1) { x.moveTo(cx - r, ey - r * 1.95); x.quadraticCurveTo(cx, ey - r * 2.45, cx + r, ey - r * 1.85); }
    else { x.moveTo(cx - r * 0.9, ey - r * 1.6); x.quadraticCurveTo(cx, ey - r * 1.9, cx + r * 0.9, ey - r * 1.6); }
    x.stroke();
  }
  x.beginPath();
  const mw = W * 0.15;
  if (mood === "ko") { x.moveTo(W / 2 - mw, my); for (let i = 0; i <= 6; i++) x.lineTo(W / 2 - mw + i * mw / 3, my + (i % 2 ? 11 : -11)); x.stroke(); }
  else if (mood === "happy") { x.moveTo(W / 2 - mw * 1.3, my - 14); x.quadraticCurveTo(W / 2, my + 66, W / 2 + mw * 1.3, my - 14); x.closePath(); x.fill(); if (!mono) { x.fillStyle = "#ff7a85"; x.beginPath(); x.ellipse(W / 2, my + 20, mw * 0.5, 10, 0, 0, Math.PI * 2); x.fill(); x.fillStyle = ink; } }
  else if (mood === "hurt") { x.ellipse(W / 2, my + 8, mw * 0.5, 24, 0, 0, Math.PI * 2); x.fill(); }
  else if (mood === "angry") { rr(x, W / 2 - mw, my - 16, mw * 2, 36, 9); x.fillStyle = mono ? bg : "#fff"; x.fill(); x.stroke(); x.beginPath(); x.moveTo(W / 2 - mw, my + 2); x.lineTo(W / 2 + mw, my + 2); for (const k of [-0.5, 0, 0.5]) { x.moveTo(W / 2 + mw * k, my - 16); x.lineTo(W / 2 + mw * k, my + 20); } x.stroke(); }
  else if (ch.mouthOpen) { x.ellipse(W / 2, my + 6, mw * 0.55, 26, 0, 0, Math.PI * 2); x.fill(); }
  else if (mood === "smug") { x.moveTo(W / 2 - mw, my + 6); x.quadraticCurveTo(W / 2 + mw * 0.3, my + 24, W / 2 + mw, my - 12); x.stroke(); }
  else { x.moveTo(W / 2 - mw * 0.8, my); x.quadraticCurveTo(W / 2, my + 28, W / 2 + mw * 0.8, my); x.stroke(); }
  // The font's own "Aa" is the belly
  x.fillStyle = ink; x.textAlign = "center"; x.textBaseline = "middle";
  const px = Math.min(fitPx(x, "Aa", 400, fam(ch), W * 0.74, 400), H * 0.44);
  x.font = `400 ${px}px ${fam(ch)}`; x.fillText("Aa", W / 2, H * 0.72);
  t.needsUpdate = true;
}
export const setMood = (ch: Fighter, m: Mood): void => { if (ch.mood !== m) { ch.mood = m; drawFace(ch); } };

// Arm poses as [swing out, swing forward, elbow bend] for the left and right arm
function armPose(ch: Fighter, arm: Arm, now: number): [number, number, number] {
  const s = arm.sx, right = s > 0, w = Math.sin(ch.t * 2 + (right ? 1.4 : 0));
  if (ch.punch > 0 && right) return [0.25, -1.55 * ch.punch, -0.15];
  if (ch.punch < 0 && right) return [0.5, 0.9 * -ch.punch, -1.7]; // wind-up
  switch (ch.mood) {
    case "happy": return [s * (2.55 + Math.sin(ch.t * 11 + (right ? 0 : 1.5)) * 0.28), 0, -0.35];
    case "angry": return [s * 0.55, -0.7, -1.75];
    case "hurt": return [s * 1.5, 0.5, -0.5];
    case "ko": return [s * 1.35, 0.2, -0.2];
    case "smug": return right ? [0.25, -0.35, -2.0] : [-0.9, 0.15, -1.5]; // one hand on the hip
  }
  if (ch.talking && right) return [0.75, -0.75 + Math.sin(now * 0.011) * 0.3, -1.25 + Math.sin(now * 0.017) * 0.35];
  return [s * (0.38 + w * 0.05), w * 0.06, -0.3];
}
export function animateCharacter(ch: Fighter, gdt: number, now: number): void {
  ch.t += gdt;
  const k = Math.min(1, gdt * 12);
  for (const arm of ch.arms) {
    const target = armPose(ch, arm, now);
    for (let i = 0; i < 3; i++) arm.cur[i] += (target[i] - arm.cur[i]) * (ch.punch ? 1 : k);
    arm.sh.rotation.set(arm.cur[1], 0, arm.cur[0]); arm.el.rotation.x = arm.cur[2];
  }
  if (ch.mood !== "ko") {
    const cheering = ch.mood === "happy";
    ch.body.position.y = Math.sin(ch.t * 2.2) * 0.03 + (cheering ? Math.abs(Math.sin(ch.t * 8)) * 0.4 : 0);
    ch.torso.scale.y = (ch.torso.userData.sy || 1) * (1 + Math.sin(ch.t * 2.2) * 0.015);
    ch.torso.rotation.z = cheering ? Math.sin(ch.t * 8) * 0.06 : ch.talking ? Math.sin(now * 0.008) * 0.03 : 0;
    ch.legs.forEach((l, i) => l.rotation.x = cheering ? Math.sin(ch.t * 8 + i * Math.PI) * 0.35 : 0);
    ch.nextBlink -= gdt;
    if (ch.nextBlink <= 0) { if (!ch.blink) { ch.blink = true; ch.nextBlink = 0.12; } else { ch.blink = false; ch.nextBlink = 2 + Math.random() * 3; } drawFace(ch); }
    if (ch.talking) { const open = Math.floor(now / 110) % 2 === 0; if (open !== ch.mouthOpen) { ch.mouthOpen = open; drawFace(ch); } }
    else if (ch.mouthOpen) { ch.mouthOpen = false; drawFace(ch); }
    // turn toward whoever we're looking at, or back to the audience
    if (ch.lookAt && !ch.lockYaw) { const p = ch.lookAt.root.position; ch.yaw = Math.atan2(p.x - ch.root.position.x, p.z - ch.root.position.z); }
    else if (!ch.lookAt && ch.homeYaw != null) ch.yaw = ch.homeYaw;
    if (!ch.lockYaw) { let d = ch.yaw - ch.root.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); ch.root.rotation.y += d * Math.min(1, gdt * 6); }
  }
  if (ch.extras.tip) ch.extras.tip.material.emissiveIntensity = 0.6 + Math.sin(ch.t * 4) * 0.4;
  if (ch.extras.cursor) ch.extras.cursor.visible = Math.floor(now / 500) % 2 === 0;
  if (ch.extras.cape) { const a = ch.extras.cape.geometry.attributes.position as THREE.BufferAttribute, arr = a.array as Float32Array, b = ch.extras.capeBase!, h = ch.H - LEG_H; for (let i = 0; i < a.count; i++) { const y = b[i * 3 + 1]; arr[i * 3 + 2] = b[i * 3 + 2] - (0.5 - y / h) * 0.3 * (1 + Math.sin(ch.t * 3 + y * 3 + b[i * 3] * 2) * 0.35); } a.needsUpdate = true; }
  if (ch.stars) ch.stars.forEach((s, i) => { const a = now * 0.004 + i * 2.1; s.position.set(Math.sin(a) * 0.8, 1.9, Math.cos(a) * 0.8); });
}


// The static set: studio floor, stands, crowd, floodlights and the big screen.
import * as THREE from "three";
import { canvasTex, fitPx, mat, mesh, scene } from "./scene";

{
  // Studio floor: deep navy with faint range rings and a tri-colour boundary, one arc per corner
  const { x, t } = canvasTex(1024, 1024), C = 512;
  const g = x.createRadialGradient(C, C, 40, C, C, 512); g.addColorStop(0, "#1c2748"); g.addColorStop(0.7, "#111a33"); g.addColorStop(1, "#0b1122");
  x.fillStyle = g; x.fillRect(0, 0, 1024, 1024);
  x.strokeStyle = "rgba(243,245,250,.07)"; x.lineWidth = 2;
  for (let r = 70; r < 470; r += 66) { x.beginPath(); x.arc(C, C, r, 0, Math.PI * 2); x.stroke(); }
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; x.beginPath(); x.moveTo(C + Math.cos(a) * 400, C + Math.sin(a) * 400); x.lineTo(C + Math.cos(a) * 452, C + Math.sin(a) * 452); x.stroke(); }
  x.lineWidth = 9; x.lineCap = "butt";
  ["#34c46b", "#ffb020", "#3d8bff"].forEach((c, i) => { const a0 = -Math.PI / 2 - Math.PI / 3 + (i * Math.PI * 2) / 3; x.strokeStyle = c; x.beginPath(); x.arc(C, C, 474, a0 + 0.02, a0 + (Math.PI * 2) / 3 - 0.02); x.stroke(); });
  x.strokeStyle = "rgba(243,245,250,.16)"; x.lineWidth = 3; x.beginPath(); x.arc(C, C, 40, 0, Math.PI * 2); x.moveTo(C - 64, C); x.lineTo(C + 64, C); x.moveTo(C, C - 64); x.lineTo(C, C + 64); x.stroke();
  const floor = mesh(new THREE.CylinderGeometry(15, 15.6, 0.8, 96), [mat(0x0b1020), new THREE.MeshStandardMaterial({ map: t, roughness: 0.82, metalness: 0 }), mat(0x0b1020)], false);
  floor.position.y = -0.4; scene.add(floor);
  const lip = mesh(new THREE.TorusGeometry(15.05, 0.08, 8, 96), new THREE.MeshStandardMaterial({ color: 0xf3f5fa, emissive: 0xf3f5fa, emissiveIntensity: 0.35 }), false);
  lip.rotation.x = Math.PI / 2; lip.position.y = 0.02; scene.add(lip);
}

// Stepped stands with a gap toward the camera
const STAND_GAP = 0.75;
{
  const profile: [number, number][] = [[18.5, -0.4], [18.5, 0.6], [20.3, 0.6], [20.3, 1.5], [22.1, 1.5], [22.1, 2.4], [23.9, 2.4], [23.9, 3.3], [26, 3.3], [26, -0.4]];
  scene.add(mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 80, STAND_GAP, Math.PI * 2 - STAND_GAP * 2), mat(0x1c2440, { side: THREE.DoubleSide })));
}

/* ---------- Crowd: blocks in the corner colours that bounce, harder when someone lands a hit ---------- */
const CROWD_COLORS = [0x3d8bff, 0x34c46b, 0xffb020, 0xf3f5fa, 0x2a3558, 0xe0261c, 0x3d8bff, 0x34c46b, 0xffb020, 0x5a6585];
interface Seat { r: number; y: number; a: number; ph: number }
const seats: Seat[] = [];
for (let tier = 0; tier < 4; tier++) {
  const r = 19.4 + tier * 1.8, y = 0.6 + tier * 0.9;
  for (let a = STAND_GAP + 0.06; a < Math.PI * 2 - STAND_GAP - 0.06; a += 1.36 / r) seats.push({ r: r + (Math.random() - 0.5) * 0.3, y, a, ph: Math.random() * 10 });
}
const crowdMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.75, 0.3), new THREE.MeshStandardMaterial({ roughness: 0.6 }), seats.length);
crowdMesh.castShadow = true;
seats.forEach((_, i) => crowdMesh.setColorAt(i, new THREE.Color(CROWD_COLORS[i % CROWD_COLORS.length])));
scene.add(crowdMesh);

export const crowd = {
  /** Excitement, about 0.1 (murmur) to 2+ (knockout). Decays on its own. */
  cheer: 0,
};
const dummy = new THREE.Object3D();
export function updateCrowd(now: number, dt: number): void {
  crowd.cheer = Math.max(0.12, crowd.cheer - dt * 0.5);
  seats.forEach((s, i) => {
    dummy.position.set(Math.sin(s.a) * s.r, s.y + 0.38 + Math.max(0, Math.sin(now * 0.008 + s.ph)) * crowd.cheer * 0.8, Math.cos(s.a) * s.r);
    dummy.rotation.set(0, s.a + Math.PI, Math.sin(now * 0.006 + s.ph) * crowd.cheer * 0.3);
    dummy.updateMatrix(); crowdMesh.setMatrixAt(i, dummy.matrix);
  });
  crowdMesh.instanceMatrix.needsUpdate = true;
}

// Floodlights in the corners of the stands
for (const a of [1.3, -1.3, 2.6, -2.6]) {
  const g = new THREE.Group(), pole = mesh(new THREE.CylinderGeometry(0.2, 0.3, 14, 6), mat(0x3a3f4c));
  pole.position.y = 7;
  const head = mesh(new THREE.BoxGeometry(2.4, 1.2, 0.6), mat(0xfff6d8, { emissive: 0xfff6d8, emissiveIntensity: 1 }), false);
  head.position.y = 14; g.add(pole, head); g.position.set(Math.sin(a) * 27.5, 0, Math.cos(a) * 27.5); g.lookAt(0, 0, 0); scene.add(g);
}

/* ---------- The big screen ---------- */
const jumbo = canvasTex(1024, 320);
{
  const frame = mesh(new THREE.BoxGeometry(17, 5.9, 0.6), mat(0x23283a)); frame.position.set(0, 10.5, -27.5);
  const display = new THREE.Mesh(new THREE.PlaneGeometry(16.2, 5.06), new THREE.MeshBasicMaterial({ map: jumbo.t, toneMapped: false }));
  display.position.set(0, 10.5, -27.18);
  const leg = mesh(new THREE.BoxGeometry(0.6, 8, 0.6), mat(0x23283a)); leg.position.set(0, 4, -27.6);
  scene.add(frame, display, leg);
}
// Canvas text extras that not every browser has yet
type StretchyContext = CanvasRenderingContext2D & { fontStretch?: string; letterSpacing?: string };
/** Redraws the big screen. `titleFamily` sets the title in a contender's own font instead of the broadcast face. */
export function setJumbo(top: string, title: string, sub: string, titleFamily?: string): void {
  const x: StretchyContext = jumbo.x;
  x.fillStyle = "#0b1122"; x.fillRect(0, 0, 1024, 320);
  x.fillStyle = "#3d8bff"; x.fillRect(0, 0, 341, 8); x.fillStyle = "#34c46b"; x.fillRect(341, 0, 342, 8); x.fillStyle = "#ffb020"; x.fillRect(683, 0, 341, 8);
  x.textAlign = "center"; x.textBaseline = "alphabetic";
  if ("fontStretch" in x) x.fontStretch = "condensed";
  x.fillStyle = "#a3acc2"; x.font = `700 32px "Archivo", sans-serif`;
  if ("letterSpacing" in x) x.letterSpacing = "4px";
  x.fillText(top.toUpperCase(), 512, 70);
  if ("letterSpacing" in x) x.letterSpacing = "0px";
  const family = titleFamily ?? `"Archivo", sans-serif`, text = titleFamily ? title : title.toUpperCase();
  x.fillStyle = "#ffffff"; const px = fitPx(x, text, 800, family, 940, 124); x.font = `800 ${px}px ${family}`; x.fillText(text, 512, 206);
  x.fillStyle = "#ffb020"; x.font = `600 34px "Archivo", sans-serif`; x.fillText(sub, 512, 280);
  if ("fontStretch" in x) x.fontStretch = "normal";
  jumbo.t.needsUpdate = true;
}

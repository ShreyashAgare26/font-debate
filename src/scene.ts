// The renderer, the camera object, lights and small drawing helpers shared by everything in the 3D world.
import * as THREE from "three";
import { $ } from "./util";

export const canvas = $<HTMLCanvasElement>("gl");
function createRenderer(): THREE.WebGLRenderer {
  try { return new THREE.WebGLRenderer({ canvas, antialias: true }); }
  catch (e) { $("loading").textContent = "This needs WebGL, and your browser has it switched off. Try another browser."; throw e; }
}
export const renderer = createRenderer();
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070a14); scene.fog = new THREE.Fog(0x070a14, 44, 100);
export const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 300);

// The canvas is sized by CSS (100% x 100%); `false` keeps three.js from overriding that with pixel-buffer dimensions.
function resize(): void { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener("resize", resize); resize();

/** Panels cover part of the screen, so every frame we re-centre the 3D view on the space that's left. */
export const view = {
  shift: { x: 0, y: 0 },
  /** Share of the screen height not covered by panels. The camera zooms out to fit it. */
  freeFrac: 1,
};
const isOpen = (id: string) => !$(id).classList.contains("hidden");
export function frameView(dt: number): void {
  let tx = 0, ty = 0, free = 1;
  if (isOpen("verdict")) { const r = $("verdict").getBoundingClientRect(); if (r.left > innerWidth * 0.3) tx = innerWidth / 2 - r.left / 2; else ty = innerHeight / 2 - r.top / 2; }
  else if (isOpen("lineup")) { const top = $("lineup").getBoundingClientRect().top; ty = innerHeight / 2 - top / 2; free = top / innerHeight; }
  else if (isOpen("hud")) { const top = $("bottom").getBoundingClientRect().top; ty = innerHeight / 2 - top / 2; free = top / innerHeight; }
  const k = Math.min(1, dt * 6), s = view.shift;
  view.freeFrac += (Math.max(0.35, Math.min(1, free)) - view.freeFrac) * k;
  s.x += (Math.max(0, tx) - s.x) * k; s.y += (Math.max(0, ty) - s.y) * k;
  if (Math.abs(s.x) + Math.abs(s.y) > 0.5) camera.setViewOffset(innerWidth, innerHeight, s.x, s.y, innerWidth, innerHeight); else camera.clearViewOffset();
}

scene.add(new THREE.HemisphereLight(0xcfdcff, 0x1a2140, 0.72));
const sun = new THREE.DirectionalLight(0xfff4e0, 0.8);
sun.position.set(6, 22, 14); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
scene.add(sun);
const rim = new THREE.DirectionalLight(0x8fb8ff, 0.35); rim.position.set(-10, 8, -14); scene.add(rim);

/* ---------- Materials and meshes ---------- */
type MatExtra = THREE.MeshStandardMaterialParameters;
/** Faceted material for the set (stands, poles). */
export const mat = (color: THREE.ColorRepresentation, extra: MatExtra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true, ...extra });
/** Smooth, slightly glossy material for characters and podiums. */
export const smooth = (color: THREE.ColorRepresentation, extra: MatExtra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.42, metalness: 0.03, ...extra });
export function mesh<M extends THREE.Material | THREE.Material[]>(geo: THREE.BufferGeometry, material: M, shadow = true): THREE.Mesh<THREE.BufferGeometry, M> {
  const o = new THREE.Mesh(geo, material); o.castShadow = shadow; o.receiveShadow = true; return o;
}

/* ---------- Canvas textures ---------- */
export interface CanvasTex { c: HTMLCanvasElement; x: CanvasRenderingContext2D; t: THREE.CanvasTexture }
export function canvasTex(w: number, h: number): CanvasTex {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  return { c, x: c.getContext("2d")!, t };
}
/** Traces a rounded rectangle path. */
export function rr(x: CanvasRenderingContext2D, X: number, Y: number, W: number, H: number, r: number): void {
  x.beginPath(); x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); x.closePath();
}
/** The largest font size up to `start` at which `text` fits in `maxW`. */
export function fitPx(x: CanvasRenderingContext2D, text: string, weight: number, family: string, maxW: number, start: number): number {
  x.font = `${weight} ${start}px ${family}`;
  const w = x.measureText(text).width;
  return w > maxW ? Math.floor((start * maxW) / w) : start;
}
const texCache = new Map<string, THREE.CanvasTexture>();
/** A letter (or short text) set in a real web font, outlined in ink. Cached. */
export function glyphTexture(fontName: string, text: string, fg: string, size = 256): THREE.CanvasTexture {
  const key = fontName + text + fg + size, hit = texCache.get(key);
  if (hit) return hit;
  const { x, t } = canvasTex(size, size);
  x.fillStyle = fg; x.textAlign = "center"; x.textBaseline = "middle";
  x.strokeStyle = "#16181d"; x.lineWidth = size * 0.03; x.lineJoin = "round";
  const px = fitPx(x, text, 700, `"${fontName}"`, size * 0.84, size * 0.66);
  x.font = `700 ${px}px "${fontName}"`; x.strokeText(text, size / 2, size * 0.54); x.fillText(text, size / 2, size * 0.54);
  texCache.set(key, t);
  return t;
}

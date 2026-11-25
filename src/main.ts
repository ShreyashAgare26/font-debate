// Font Debate: describe a product, three typefaces argue for the job in a 3D arena, the last one standing is your font.
import "./styles.css";
import * as THREE from "three";
import { app, showScreen } from "./app";
import { setJumbo, updateCrowd } from "./arena";
import { initBrief } from "./brief";
import { camIdle, updateCamera } from "./camera";
import { animateCharacter } from "./characters";
import { updateSprites } from "./effects";
import { initHelp } from "./help";
import { floaters, initLineup } from "./lineup";
import { initMatch } from "./match";
import { camera, frameView, renderer, scene } from "./scene";
import { stepTweens, time } from "./time";
import { $, sleep, store } from "./util";
import { initVerdict } from "./verdict";

const clock = new THREE.Clock();
function frame(): void {
  // dt is real time (capped so a background tab doesn't jump); gdt is game time, which hit-stop, slow motion and "Faster" bend
  const dt = Math.min(0.05, clock.getDelta()), now = performance.now(), gdt = dt * time.scale * (time.rush ? 2.2 : 1);
  stepTweens(gdt * 1000);
  updateCrowd(now, dt); updateSprites(gdt);
  for (const letter of floaters) letter.rotation.y += letter.userData.spin * dt;
  const m = app.match;
  if (m) {
    for (const ch of m.fighters) animateCharacter(ch, gdt, now);
    if (m.partner) animateCharacter(m.partner, gdt, now);
  }
  frameView(dt); updateCamera(dt, now);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

initHelp(); initBrief(); initLineup(); initMatch(); initVerdict();

// The big screen draws with the broadcast face, so wait for it (briefly) before the first frame
void Promise.race([Promise.all([document.fonts.load('800 40px "Archivo"'), document.fonts.load('500 20px "JetBrains Mono"')]), sleep(3000)])
  .catch(() => { /* fall back to system fonts */ })
  .then(() => {
    setJumbo("Font Debate", "Who's your font?", "write a brief to start");
    camIdle(); camera.position.set(0, 9, 22);
    $("loading").classList.add("hidden");
    showScreen(store.get("seen", false) ? "brief" : "welcome");
    frame();
  });

// The welcome screen, which doubles as "How it works".
import { app, showScreen, type Screen } from "./app";
import { sfx } from "./audio";
import { $, store } from "./util";

let returnTo: Screen | null = null;
function openHelp(): void {
  returnTo = app.screen;
  $("welcome").classList.remove("hidden");
  $("welcomeGo").textContent = app.screen === "welcome" ? "Let's go" : "Back to the show";
  $("welcomeGo").focus();
}
const helpIsOpen = () => !$("welcome").classList.contains("hidden");
/** True while help covers a later screen (so game keys should be ignored). */
export const helpOverGame = () => helpIsOpen() && returnTo !== null && returnTo !== "welcome";
export function closeHelp(): void { if (helpOverGame()) $("welcomeGo").click(); }

export function initHelp(): void {
  $("welcomeGo").onclick = () => {
    sfx.unlock(); store.set("seen", true);
    if (returnTo && returnTo !== "welcome") { $("welcome").classList.add("hidden"); returnTo = null; return; }
    showScreen("brief"); $("name").focus();
  };
  document.querySelectorAll<HTMLElement>("[data-help]").forEach(b => { b.onclick = openHelp; });
}

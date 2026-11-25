# Font Debate

Describe what you're building. Three typefaces argue for the job in a live 3D arena, and the last one standing is your font. Works with all 1,800+ Google Fonts, suggests a pairing, and hands you the CSS.

Live: https://font-debate.vercel.app

## Run it

```bash
npm install
npm run dev        # local dev server with hot reload
npm run build      # type-check, then build to dist/
npm run preview    # serve the built site
npm test           # scoring and pairing tests
```

Vercel builds with `npm run build` and serves `dist/` (see `vercel.json`).

## How the game works

A match has four steps. Each step is one module in `src/`.

1. **Brief** (`brief.ts`). You give a product name, a description, up to three personality traits, and the places the font will be used.
2. **Lineup** (`lineup.ts`). The game books three fonts that fit the brief. You can swap any of them for any Google font.
3. **Debate** (`match.ts`). Every trait and every use from the brief becomes one round. Fonts lose HP in rounds they are weaker in.
4. **Verdict** (`verdict.ts`). The font with the most HP wins. You can overrule it, add a partner font, and copy the CSS.

The show (3D, camera, sound) is separate from the rules. All the rules live in `src/logic.ts`, which never touches the page, so the same functions run in the browser and in the tests.

## How the logic works (`src/logic.ts`)

### Scores

Every font has two sets of scores, each from 0 to 5:

- **Tone**: ten personality traits (playful, serious, luxury, technical, friendly, editorial, retro, bold, calm, trustworthy).
- **Use**: five jobs (app UI, headlines, long reading, numbers and data, logo or brand).

It also has a `pro` line (its opening pitch) and a `con` line (the weakness rivals attack).

Scores come from one of two places:

- **Hand-scored.** 29 well-known fonts have scores and lines written by hand (`ROWS`). These are trusted.
- **Estimated.** Every other Google font gets scores from `estimate()`. It starts from the average of the hand-scored fonts in the same category (sans, serif, mono, display, handwriting), then adjusts using Google's own metadata:
  - Heavy strokes raise "bold" and headline scores and lower reading scores.
  - Thin strokes raise "luxury" and "calm" and lower UI scores.
  - Narrow or very wide letters lower reading scores.
  - A single weight lowers UI and reading scores.
  - Very popular fonts gain some "trustworthy"; obscure ones lose it.

  The catalog in `src/data/google-fonts.ts` holds that metadata for about 1,800 fonts.

### Reading the brief

`detectTones()` looks for keywords in the description. "Fintech", "bank" or "payment" switches on "trustworthy"; "kids" or "fun" switches on "playful". The brief form shows these with a dot, and never overrides a trait you set by hand.

The chosen traits and uses become a list of **criteria**. One criterion is one round.

### Fit

`fit()` adds up a font's scores across the criteria. A trait counts ×2 and a use counts ×1.5, so personality weighs a little more than practical jobs.

`fitPct()` turns that into the percentage shown in the lineup. Estimated fonts are multiplied by 0.85 first. Their scores are guesses, so they need a clear margin to outrank a hand-scored font.

### Booking the lineup

`pickContenders()` ranks a pool (the 29 hand-scored fonts plus the 300 most-used Google fonts) by fit and picks:

1. the best fit overall,
2. the best fit from a different category,
3. the best of what is left.

The second rule is there so the debate is a real contest between different kinds of font, not three near-identical sans serifs.

### A round

`playRound()` takes the fonts still standing and one criterion:

- The font or fonts with the highest score on that criterion lead the round and take no damage.
- Every other font loses `(gap × 12) + 4` HP, where the gap is how far its score is behind the leader's. One point behind costs 16 HP; three points behind costs 40.

Every font starts at 100 HP. A font at 0 is knocked out and sits out the remaining rounds. If all fonts tie, nobody is hurt.

`winnerOf()` picks the font with the most HP after the last round, with overall fit as the tie-break. Skipping to the verdict runs the remaining rounds through the same function, so the result is the same as watching.

### Pairing

`pairingsFor()` suggests three partners for whichever font you end with.

- If the font reads well in paragraphs, it becomes the **body** font and the partners are **heading** fonts.
- If it does not, it becomes the **heading** font and the partners are **body** fonts.

Partners are ranked on how strong they are in their role, on contrast (a different category scores higher), and on fit to the brief's personality. The list takes one font per category first, so the three suggestions differ from each other.

`needsPartner()` says whether the font is too weak at reading or UI for this brief. Only then is a partner selected by default. `cssFor()` writes the CSS for one font or for a heading and body pair, asking Google Fonts only for weights the family ships.

## How the code works

### State

`app.ts` holds the two things every module shares: which screen is showing, and the current `Match` (brief, lineup, fighters, round number, winner, final choice, pairing). Modules read it through `match()`, which throws if there is no match, so a missing match fails loudly at the call instead of somewhere later.

### The 3D world

- `scene.ts` creates the renderer, camera and lights, and holds small helpers for materials and canvas textures.
- `arena.ts` builds the set once: floor, stands, crowd, floodlights and the big screen. `setJumbo()` redraws the screen's text.
- `characters.ts` builds a character from a font. Body width and depth come from the font's width and stroke thickness, handwriting fonts lean, and each category has its own outfit. The face is a canvas that is redrawn for each expression. Arms follow `armPose()`, which returns a pose for the current mood.
- `effects.ts` handles flying letters, damage numbers, shockwaves, confetti, the screen flash and the letterbox bars.

Text in the 3D world (faces, name labels, the big screen, flying letters) is drawn to a canvas with the real web font and used as a texture. This is why the game waits for a font to load before building its character.

### Time

`time.ts` runs animations on a game clock that is separate from real time. `gtween()` animates a value over a number of game milliseconds. `time.scale` slows or freezes that clock, which is how hit-stop and slow motion work. `time.rush` speeds it up when you press Next during a round.

Reading pauses (`wait()`) and camera moves use real time, so they stay on schedule at any frame rate.

### Camera

`camera.ts` describes shots (wide, on a speaker, over the shoulder, impact). Each move is timed in real milliseconds and eased, and dialogue waits for the camera to arrive.

Panels cover part of the screen, so `frameView()` in `scene.ts` measures the uncovered area every frame, shifts the view to centre on it, and widens the field of view to fit. The same code makes the layout work on phones.

### The fight sequence

`match.ts` is a script written with `async` functions, so it reads top to bottom like stage directions:

1. `startFight()` plays the opening statements.
2. `nextRound()` announces the round, asks `playRound()` who was hit, and calls `attack()` for each hit.
3. `attack()` plays the trash talk, the wind-up, the dash, the impact and the knockback, or `knockout()`.
4. `finish()` runs any remaining rounds, moves the winner to centre stage and opens the verdict.

The rules decide what happens; this file only decides how it looks.

### Sound and voices

`audio.ts` synthesises every sound effect with the Web Audio API, so there are no audio files. Dialogue is spoken with the browser's built-in speech engine: each character gets a different system voice, with pitch and speed set by its font category. `hud.ts` shows each line as a caption and `hold()` keeps the scene waiting until the line has been spoken.

### The frame loop

`main.ts` wires up each module and runs one function per frame: advance the game clock, update the crowd, effects and characters, place the camera, and render.

## Files

| File | What it holds |
| --- | --- |
| `index.html` | The page shell: every panel's markup and the SVG icons |
| `src/styles.css` | The broadcast look: colours, type, panels, motion |
| `src/logic.ts` | Scoring, rounds, pairing and CSS output. No DOM, fully tested |
| `src/logic.test.ts` | Tests for the logic |
| `src/data/google-fonts.ts` | The Google Fonts catalog (generated from Google's metadata) |
| `src/app.ts` | Shared state: the current screen and the match in progress |
| `src/scene.ts`, `src/arena.ts` | Renderer, lights, the studio set, crowd and big screen |
| `src/characters.ts` | The font characters: bodies, faces, poses, animation |
| `src/camera.ts`, `src/effects.ts`, `src/time.ts` | Shots, hit effects and game time |
| `src/audio.ts` | Sound effects and spoken dialogue |
| `src/fonts.ts` | Loading Google Fonts on demand |
| `src/copy.ts` | Round titles, boasts and example briefs |
| `src/brief.ts`, `src/lineup.ts`, `src/match.ts`, `src/verdict.ts` | The four steps of the flow |
| `src/hud.ts`, `src/help.ts` | The fight HUD and the welcome screen |
| `src/main.ts` | Wires everything up and runs the frame loop |

## Notes

- three.js is pinned to 0.149. Newer versions change lighting and colour handling, so upgrading means retuning the look.
- `legacy/` keeps the original single-file versions. They still open directly in a browser.

# Font Debate

Describe what you're building. Three typefaces argue for the job in a live 3D arena, and the last one standing is your font. Works with all 1,800+ Google Fonts, suggests a pairing, and hands you the CSS.

## Run it

```bash
npm install
npm run dev        # local dev server with hot reload
npm run build      # type-check, then build to dist/
npm run preview    # serve the built site
npm test           # scoring and pairing tests
```

Vercel builds with `npm run build` and serves `dist/` (see `vercel.json`).

## How the code is organised

| File | What it holds |
| --- | --- |
| `index.html` | The page shell: every panel's markup and the SVG icons |
| `src/styles.css` | The broadcast look: colours, type, panels, motion |
| `src/logic.ts` | Pure scoring: fonts, fit, rounds, pairing, CSS. No DOM, fully tested |
| `src/data/google-fonts.ts` | The Google Fonts catalog (generated from Google's metadata) |
| `src/app.ts` | Shared state: the current screen and the match in progress |
| `src/scene.ts`, `src/arena.ts` | Renderer, lights, the studio set, crowd and big screen |
| `src/characters.ts` | The font characters: bodies, faces, poses, animation |
| `src/camera.ts`, `src/effects.ts`, `src/time.ts` | Shots, hit effects, and game time (hit-stop, slow motion) |
| `src/audio.ts` | Synthesised sound effects and spoken dialogue (browser speech engine) |
| `src/brief.ts`, `src/lineup.ts`, `src/match.ts`, `src/hud.ts`, `src/verdict.ts` | The four steps of the flow and the fight HUD |
| `src/main.ts` | Wires everything up and runs the frame loop |

## Notes

- three.js is pinned to 0.149. Newer versions change lighting and colour handling, so upgrading means retuning the look.
- `legacy/` keeps the original single-file versions. They still open directly in a browser.

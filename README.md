# Font Debate

Can't pick a font? Tell this game what you're building, and three fonts will fight for the job in a 3D arena. The last one standing is your font.

**Play it:** https://font-debate.vercel.app

## How to play

1. **Describe your product.** Give it a name and say how it should feel, for example "friendly but trustworthy".
2. **Meet the fonts.** The game picks three fonts that suit you. Don't like one? Swap it for any of the 1,800+ Google Fonts.
3. **Watch the fight.** Each round tests one thing you asked for. Fonts that do worse lose health.
4. **Get your font.** The winner is your pick, but you can choose a different one. You also get a matching second font and the code to use them.

## How the game decides

**Every font has scores.** Each font is rated from 0 to 5 on personality (like "playful" or "serious") and on jobs (like "easy to read" or "good for headlines").

- 29 popular fonts were rated by hand.
- The other fonts are rated automatically, using facts Google publishes about each one, like how thick or wide its letters are.

**Your description sets the rounds.** If you write "fintech" or "bank", the game adds a "trustworthy" round. Every trait and job you pick is one round.

**Each round, the best font hits the others.** The font with the highest score in that round takes no damage. The others lose health based on how far behind they are. Everyone starts with 100 health, and a font at 0 is knocked out.

**Most health wins.** When the rounds are over, the font with the most health left is the winner.

**Fonts that pair well.** Some fonts are great for big headlines but hard to read in long paragraphs, so the game suggests a second font for the body text. It looks for a font that is good at that job and looks different, so the two work well together.

## How the code is organised

The code lives in `src/`. The rules and the show are kept apart:

- **The rules** are all in `logic.ts`: scores, rounds, who wins and font pairing. This file has tests (`logic.test.ts`).
- **The show** is everything else: the 3D arena, characters, camera, sound and screens.

| File | What it does |
| --- | --- |
| `logic.ts` | The rules of the game |
| `brief.ts` | Step 1: describing your product |
| `lineup.ts` | Step 2: picking and swapping fonts |
| `match.ts` | Step 3: the fight |
| `verdict.ts` | Step 4: the result, font pairing and code |
| `characters.ts` | The font characters and their faces |
| `arena.ts`, `scene.ts` | The 3D arena, lights and crowd |
| `camera.ts` | Camera shots |
| `effects.ts` | Hit effects like flying letters and confetti |
| `audio.ts` | Sound effects and voices |
| `hud.ts` | Health bars and captions during the fight |
| `main.ts` | Starts everything up |

## Run it yourself

You need [Node.js](https://nodejs.org) installed. Then run:

```bash
npm install     # one time, to download what the project needs
npm run dev     # starts the game; open the link it prints
```

Other commands:

- `npm test` checks that the rules work.
- `npm run build` makes the files to put online.

The old one-file versions of the game are in the `legacy/` folder.

# Third-party notices

Font Debate is my own code, under the MIT license (see `LICENSE`). The built website also includes or loads other people's work. Each part keeps its own license, listed here.

## Included in the built site

| Component | What it does here | License |
| --- | --- | --- |
| [three.js](https://github.com/mrdoob/three.js) | The 3D scene | MIT |
| [kokoro-js](https://github.com/hexgrad/kokoro/tree/main/kokoro.js) | Runs the Kokoro voice model in the browser | Apache 2.0 |
| [Transformers.js](https://github.com/huggingface/transformers.js) (`@huggingface/transformers`, `@huggingface/jinja`) | Loads and runs the model | Apache 2.0 (jinja: MIT) |
| [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) (`onnxruntime-web`, `onnxruntime-common`) | The engine the model runs on | MIT |
| [phonemizer](https://github.com/xenova/phonemizer) | Turns text into pronunciation for the voices | Apache 2.0 |
| [eSpeak NG](https://github.com/espeak-ng/espeak-ng), bundled inside phonemizer as WebAssembly | The pronunciation engine | **GPL v3 or later** |

**About eSpeak NG:** it's licensed under the GNU General Public License v3 (or later). Its full source code is at https://github.com/espeak-ng/espeak-ng, and the license text is at https://www.gnu.org/licenses/gpl-3.0.html. I haven't modified it. It reaches this project through the `phonemizer` package, which `kokoro-js` depends on.

## Loaded from elsewhere (not in this repo)

| Component | Where it comes from | License |
| --- | --- | --- |
| [Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) voice model (the [ONNX version](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX)) | Downloaded by your browser from Hugging Face | Apache 2.0 |
| Every font in the game, including [Archivo](https://fonts.google.com/specimen/Archivo) and [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) | Google Fonts | Mostly SIL Open Font License 1.1; a few are Apache 2.0 or Ubuntu Font License. Each font's page on Google Fonts lists its license. |

## Used only to build and test

Vite, TypeScript and Vitest (all MIT). They aren't shipped to visitors.

The full license texts for everything installed through npm are in each package's folder under `node_modules/` after `npm install`.

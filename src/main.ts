import "./style.css";

import { WebR } from "webr";
import { setupEditor } from "./components/editor.ts";
import { html, styles } from "./helpers/index.ts";
import { runCode } from "./actions/index.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>Loading...</div>
`;

const webR = new WebR();
await webR.init();

document.querySelector<HTMLDivElement>("#app")!.innerHTML = html`
  <div class="w-full h-full">
    <div
      class="flex items-center monaco-component opacity-90 py-2 px-4"
      ${styles({ backgroundColor: "var(--vscode-editor-background)" })}
    >
      <button id="run-code">Run</button>

      <div class="ml-auto">
        <select id="select-theme">
          <option>theme</option>
        </select>
      </div>
    </div>
    <div class="flex flex-col h-full">
      <div id="editor" class="flex-1 w-full"></div>
      <div
        id="console"
        class="h-[300px] w-full monaco-component opacity-90 p-4 font-mono"
        ${styles({
          backgroundColor: "var(--vscode-editor-background)",
          color: "var(--vscode-editor-foreground)",
        })}
      ></div>
    </div>
  </div>
`;

setupEditor(
  document.querySelector<HTMLElement>("#editor")!,
  document.querySelector<HTMLSelectElement>("#select-theme")!,
  webR
);

document
  .querySelector<HTMLButtonElement>("#run-code")!
  .addEventListener("click", runCode.bind(this, webR));

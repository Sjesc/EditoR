import "./style.css";

import { WebR } from "webr";
import { setupEditor, runCode } from "./actions/index.ts";
import { html, styles } from "./helpers/index.ts";
import { components, getComponent, updateComponent } from "./components/index.ts";
import * as monaco from "monaco-editor";

updateComponent("app", html`<div>Loading...</div>`);

const webR = new WebR();
await webR.init();

updateComponent(
  "app",
  html`
    <div class="w-full h-full flex flex-col">
      <div
        class="flex items-center monaco-component opacity-90 py-2 px-4"
        ${styles({ backgroundColor: "var(--vscode-editor-background)" })}
      >
        <button id="${components.runCode}">Run</button>

        <div class="ml-auto">
          <select id="${components.themeSelector}">
            <option>theme</option>
          </select>
        </div>
      </div>
      <div class="flex flex-col flex-1">
        <div id="${components.editor}" class="flex-1 w-full"></div>
        <div
          id="${components.console}"
          class="h-[300px] w-full monaco-component opacity-90 p-4 font-mono overflow-y-auto"
          ${styles({
            backgroundColor: "var(--vscode-editor-background)",
            color: "var(--vscode-editor-foreground)",
          })}
        ></div>
      </div>
    </div>
  `
);

setupEditor(webR);

const runCodeButton = getComponent<HTMLButtonElement>("runCode");
runCodeButton.addEventListener("click", runCode);

export const state = {
  monaco: monaco,
  webR: webR,
} as const;

for (;;) {
  const output = await webR.read();
  switch (output.type) {
    case "stdout":
      console.log(output.data);
      break;
    case "stderr":
      console.error(output.data);
      break;
    case "prompt":
      console.log(output.data);
      break;
    default:
      console.warn(`Unhandled output type: ${output.type}.`);
  }
}

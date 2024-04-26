import "./style.css";

import { WebR } from "webr";
import { setupEditor, runCode, insertConsoleLine } from "./actions/index.ts";
import { html, styles } from "./helpers/index.ts";
import { components, getComponent, updateComponent } from "./common/components.ts";
import * as monaco from "monaco-editor";

updateComponent("app", html`<div>Loading...</div>`);

const webR = new WebR();
await webR.init();

await webR.evalRVoid("webr::shim_install()");
await webR.evalRVoid("options(device=webr::canvas)");

updateComponent(
  "app",
  html`
    <div class="w-full h-full flex flex-col">
      <nav
        class="flex items-center monaco-component opacity-90 py-2 px-4"
        ${styles({ backgroundColor: "var(--vscode-editor-background)" })}
      >
        <button id="${
          components.runCode
        }" class="flex items-center gap-x-1 disabled:bg-red-500 disabled:opacity-50">Run <span class="text-xs opacity-80">(Ctrl+Enter)</span> </button>

        <div class="ml-auto">
          <select id="${components.themeSelector}">
            <option>theme</option>
          </select>
        </div>
      </nav>

      <div class="flex flex-1">
        <div class="flex flex-col flex-1">
          <main id="${components.editor}" class="flex-1 w-full"></main>
          <div
            class="h-[24px] px-4 text-xs flex items-center monaco-component opacity-95"
            ${styles({ backgroundColor: "var(--vscode-editor-background)", color: "var(--vscode-editor-foreground)" })}
          >
            <div>
              Ln <span id="${components.statusLine}">1</span>, Col <span id="${components.statusColumn}">1</span>
            </div>
          </div>
          <footer
            class="h-[300px] w-full monaco-component opacity-90 p-4 overflow-y-auto text-sm"
            ${styles({
              backgroundColor: "var(--vscode-editor-background)",
              color: "var(--vscode-editor-foreground)",
              fontFamily: "JetBrainsMono",
            })}
          >
            <div id="${components.console}"></div>
            <div class="flex">
              <div class="opacity-40 mr-1" id=${components.consoleInputPrefix}>&gt;</div>
              <input
                id="${components.consoleInput}"
                class="bg-transparent w-full"
                ${styles({ outline: "none !important" })}
                autocomplete="off"
              />
            </div>
          </footer>
        </div>

        <aside class="w-[500px] grid p-4 monaco-component" ${styles({
          backgroundColor: "var(--vscode-editor-background)",
          color: "var(--vscode-editor-foreground)",
          gridTemplateRows: "1fr 1fr 3fr",
        })}>
            <div>
              <div class="font-medium text-lg mb-1">Enviroment</div>
              <div id="${components.enviroment}"></div>
            </div>

            <div>
              <div class="font-medium text-lg mb-1">Packages</div>
              <div id="${components.packages}"></div>
              ${/* .packages(TRUE) */ ""}
            </div>

            <div>
              <div class="font-medium text-lg mb-1">Plots</div>
              <div class="bg-white flex overflow-auto gap-x-2 flex-wrap" id="${components.plots}"></div>
            </div>
       
        </aside>
        </div>
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

let canvas = null;

for (;;) {
  const output = await webR.read();
  const rConsoleInputPrefix = getComponent("consoleInputPrefix");
  const runButton = getComponent<HTMLButtonElement>("runCode");
  const plots = getComponent("plots");

  switch (output.type) {
    case "stdout":
      insertConsoleLine(output.data, "");
      break;
    case "stderr":
      insertConsoleLine(output.data, "", "var(--vscode-editorError-foreground)");
      console.error(output.data);
      break;
    case "prompt":
      rConsoleInputPrefix.innerHTML = output.data;
      runButton.disabled = false;
      break;
    case "canvas":
      if (output.data.event === "canvasImage") {
        canvas?.getContext("2d")?.drawImage(output.data.image, 0, 0);
      } else if (output.data.event === "canvasNewPage") {
        // Create a new canvas element
        canvas = document.createElement("canvas");
        canvas.setAttribute("width", "1008");
        canvas.setAttribute("height", "1008");
        canvas.style.width = `${plots.clientWidth}px`;
        canvas.style.height = `${plots.clientWidth}px`;
        canvas.style.display = "inline-block";
        plots.innerHTML = "";
        plots.appendChild(canvas);
      }
      break;
    default:
      console.warn(`Unhandled output type: ${output.type}.`);
  }
}

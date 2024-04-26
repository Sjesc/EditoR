import "./style.css";
const themesPs = import.meta.glob("./themes/*.json");

import { WebR } from "webr";
import { setupEditor, runCode, insertConsoleLine, runAll } from "./actions/index.ts";
import { html, styles } from "./helpers/index.ts";
import { components, getComponent, updateComponent } from "./common/components.ts";
import * as monaco from "monaco-editor";

export const loadThemes = () =>
  Promise.all(
    Object.entries(themesPs).map(async ([path, loadTheme]) => {
      const theme = (await loadTheme()) as { colors: Record<string, string> };

      const [_, __, fileName] = path.split("/");
      const themeName = fileName.split(".")[0];
      const name = themeName.replace(/\s/g, "").toLowerCase();

      return { name, theme };
    })
  );

export const themes = await loadThemes();

const themeName = localStorage.getItem("theme") ?? "dracula";
const theme = themes.find((x) => x.name === themeName)?.theme ?? themes[0].theme;

updateComponent(
  "app",
  html`<div
    class="flex flex-col items-center justify-center h-screen "
    ${styles({ backgroundColor: theme.colors["editor.background"], color: theme.colors["editor.foreground"] })}
  >
    <div class="mb-8 opacity-70 text-xl font-thin">Loading...</div>
    <div class="loader">
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
      <div></div>
    </div>
  </div>`
);

const webR = new WebR();
await webR.init();

await webR.evalRVoid("webr::shim_install()");
await webR.evalRVoid("options(device=webr::canvas)");

updateComponent(
  "app",
  html`
    <div
      class="w-full h-full"
      ${styles({
        backgroundColor: theme.colors["editor.background"],
        color: theme.colors["editor.foreground"],
      })}
    >
      <div
        class="w-full h-full flex flex-col monaco-component"
        ${styles({
          backgroundColor: "var(--vscode-editor-background)",
          color: "var(--vscode-editor-foreground)",
        })}
      >
        <nav class="flex items-center monaco-component opacity-90 py-2 px-4 gap-x-2">
          <button id="${components.runCode}" class="flex items-center gap-x-1 disabled:bg-red-500 disabled:opacity-50">
            Run <span class="text-xs opacity-80">(Ctrl+Enter)</span>
          </button>

          <button
            id="${components.runAll}"
            class="bg-green-600  flex items-center gap-x-1 disabled:bg-red-500 disabled:opacity-50"
          >
            Run all <span class="text-xs opacity-80">(Ctrl+Shift+Enter)</span>
          </button>

          <div class="ml-auto flex gap-x-1 items-center">
            <label class="opacity-60" for="${components.themeSelector}">Theme</label>
            <select id="${components.themeSelector}"></select>
          </div>
        </nav>

        <div class="flex flex-1 overflow-hidden">
          <div class="flex flex-col flex-1">
            <main id="${components.editor}" class="flex-1 w-full"></main>
            <div class="h-[24px] px-4 text-xs flex items-center bg-black bg-opacity-10">
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

          <aside
            class="w-[500px] grid gap-y-4 p-4 monaco-component overflow-hidden"
            ${styles({
              gridTemplateRows: "1fr 1fr 3fr",
              borderLeft: "1px solid var(--vscode-editorWidget-border)",
            })}
          >
            <div
              class="flex flex-col overflow-hidden pb-2"
              ${styles({
                borderBottom: "1px solid var(--vscode-editorWidget-border)",
              })}
            >
              <div class="font-thin text-lg mb-1">Enviroment</div>
              <div id="${components.enviroment}" class="overflow-auto"></div>
            </div>

            <div
              class="flex flex-col overflow-hidden pb-2"
              ${styles({
                borderBottom: "1px solid var(--vscode-editorWidget-border)",
              })}
            >
              <div class="font-thin text-lg mb-1">Packages</div>
              <div id="${components.packages}" class="overflow-auto flex gap-2 flex-wrap"></div>
            </div>

            <div class="flex flex-col overflow-hidden">
              <div class="font-thin text-lg mb-1">Plots</div>
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
const runAllButton = getComponent<HTMLButtonElement>("runAll");

runCodeButton.addEventListener("click", runCode.bind(this, undefined));
runAllButton.addEventListener("click", runAll);

const inputHistory: string[] = [];

const rConsoleInput = getComponent<HTMLInputElement>("consoleInput");
rConsoleInput.addEventListener("keydown", async (e) => {
  if (e.key === "Enter") {
    await runCode([rConsoleInput.value]);

    inputHistory.push(rConsoleInput.value);

    rConsoleInput.value = "";

    e.preventDefault();
  }

  if (e.key === "ArrowUp" && inputHistory.length > 0) {
    rConsoleInput.value = inputHistory.pop() ?? "";
  }
});

export const state = {
  monaco: monaco,
  webR: webR,
  queue: [] as string[],
} as const;

let canvas = null;

for (;;) {
  const output = await webR.read();
  const rConsoleInputPrefix = getComponent("consoleInputPrefix");
  const runButton = getComponent<HTMLButtonElement>("runCode");
  const runAllButton = getComponent<HTMLButtonElement>("runAll");
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
      runAllButton.disabled = false;
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

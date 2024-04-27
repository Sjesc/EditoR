import { WebR } from "webr";
import { components, getComponent } from "../common/components";
import { getCodeBlocks, html, styles } from "../helpers";
import { Plots } from "./Plots";
import { Packages } from "./Packages";
import { Enviroment } from "./Enviroment";
import { Nav } from "./Nav";

import * as monaco from "monaco-editor";

export class Console {
  private console = getComponent<HTMLInputElement>("console");
  private input = getComponent<HTMLInputElement>("consoleInput");
  private inputPrefix = getComponent<HTMLDivElement>("consoleInputPrefix");

  private editor: monaco.editor.IStandaloneCodeEditor;
  private webR: WebR;
  private plots: Plots;
  private enviroment: Enviroment;
  private packages: Packages;
  private nav: Nav;
  private history: string[] = [];

  private isRunning = false;

  constructor(
    webR: WebR,
    plots: Plots,
    packages: Packages,
    enviroment: Enviroment,
    nav: Nav,
    editor: monaco.editor.IStandaloneCodeEditor
  ) {
    this.webR = webR;
    this.plots = plots;
    this.packages = packages;
    this.enviroment = enviroment;
    this.nav = nav;
    this.editor = editor;

    this.nav.setupButtons(this.runCode, this.runAll);
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, this.runCode.bind(this, undefined));
  }

  static render() {
    return html`<div
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
    </div>`;
  }

  async init() {
    this.input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        await this.runCode([this.input.value]);

        this.history.push(this.input.value);
        this.input.value = "";
        e.preventDefault();
      }

      if (e.key === "ArrowUp" && this.history.length > 0) {
        this.input.value = this.history.pop() ?? "";
      }
    });

    for (;;) {
      const output = await this.webR.read();

      switch (output.type) {
        case "stdout":
          this.insertConsoleLine(output.data, "");
          break;
        case "stderr":
          this.insertConsoleLine(output.data, "", "var(--vscode-editorError-foreground)");
          console.error(output.data);
          break;
        case "prompt":
          this.inputPrefix.innerHTML = output.data;
          this.nav.toggleButtons(false);
          this.isRunning = false;
          break;
        case "canvas":
          this.plots.addPlot(output);

          break;
        default:
          console.warn(`Unhandled output type: ${output.type}.`);
      }
    }
  }

  async runCode(code?: string[]) {
    if (this.isRunning) {
      return;
    }
    const lines = [];

    if (!code) {
      const model = this.editor.getModel();

      const selection = this.editor.getSelection();

      if (!selection?.isEmpty()) {
        const selected = model?.getValueInRange(
          new monaco.Range(
            selection?.startLineNumber ?? 1,
            selection?.startColumn ?? 1,
            selection?.endLineNumber ?? 1,
            selection?.endColumn ?? 1
          )
        );

        lines.push(...(selected?.split("\n") ?? []));
      } else {
        const lineNumber = selection?.startLineNumber ?? 1;
        const line = model?.getLineContent(lineNumber) ?? "";

        const blocks = getCodeBlocks(model?.getLinesContent() ?? []);

        const block = blocks.find((x) => x[0] <= lineNumber && x[1] >= lineNumber);

        if (block) {
          const [start, end] = block;

          for (let i = start; i <= end; i++) {
            lines.push(model?.getLineContent(i));
          }
        } else {
          lines.push(line);
        }
      }
    } else {
      console.log(code);
      lines.push(...code);
    }

    const prefix = getComponent("consoleInputPrefix");

    lines.forEach((line, index) => {
      this.webR.writeConsole(line ?? "");

      this.nav.toggleButtons(true);
      this.isRunning = true;

      prefix.innerHTML = "";

      this.insertConsoleLine(line ?? "", index === 0 ? "&gt;" : "+");
    });
  }

  async runAll() {
    const model = this.editor.getModel();

    await this.runCode(model?.getLinesContent() ?? []);
  }

  insertConsoleLine(text: string, prefix: string = "&gt;", color?: string) {
    this.console.innerHTML += html`<div class="monaco-component" ${styles({ color: color ?? "inherit" })}>
      <span class="opacity-40 select-none mr-1">${prefix}</span>${text}
    </div>`;

    setTimeout(() => {
      this.input.scrollIntoView({ behavior: "smooth" });
      this.enviroment.updateEnviroment();
      this.packages.updatePackages();
    }, 100);
  }
}

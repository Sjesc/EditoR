//@ts-ignore
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
  private queue: string[][] = [];

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

    const navButtons = this.nav.getButtons();
    navButtons.run.addEventListener("click", this.runCode.bind(this, undefined));
    navButtons.runAll.addEventListener("click", this.runAll.bind(this));

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, this.runCode.bind(this, undefined));
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Alt | monaco.KeyCode.Enter, this.runAll.bind(this));
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
    const _this = this;

    this.input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        if (_this.isRunning) {
          return;
        }

        this.executeLines([this.input.value]);

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
          console.log("stdout", output.data);
          this.insertConsoleLine(output.data, "");
          break;
        case "stderr":
          this.insertConsoleLine(output.data, "", "var(--vscode-editorError-foreground)");
          console.error(output.data);
          break;
        case "prompt":
          this.inputPrefix.innerHTML = output.data;

          //If prompt is >, then we can execute the next block in the queue
          if (output.data.trim() === ">") {
            const lines = this.queue.shift();

            if (lines) {
              this.executeLines(lines);
            } else {
              // If there are not more lines to execute, we can enable running new code
              this.isRunning = false;
              this.nav.toggleButtons(false);
            }
          }

          break;
        case "canvas":
          this.plots.addPlot(output);

          break;
        default:
          console.warn(`Unhandled output type: ${output.type}.`);
      }
    }
  }

  async executeLines(lines?: string[] | void) {
    if (!lines) {
      return;
    }

    let first = true;
    for (const line of lines) {
      this.webR.writeConsole(line ?? "");

      this.nav.toggleButtons(true);
      this.isRunning = true;

      this.inputPrefix.innerHTML = "";

      this.insertConsoleLine(line ?? "", first ? "&gt;" : "+");

      first = false;
    }
  }

  async runCode(code?: string[]) {
    if (this.isRunning) {
      return;
    }

    const model = this.editor.getModel();
    const allLines = model?.getLinesContent() ?? [];
    const selection = this.editor.getSelection();
    const isEmpty = !!selection?.isEmpty();

    const start = { line: 1, column: 1 };
    const end = { line: 1, column: 1 };

    if (!code) {
      start.line = selection!.startLineNumber;
      end.line = selection!.endLineNumber;

      start.column = isEmpty ? 1 : selection!.startColumn;
      end.column = isEmpty ? allLines[selection!.startLineNumber - 1].length + 1 : selection!.endColumn;
    } else {
      start.line = 1;
      end.line = allLines.length;

      start.column = 1;
      end.column = allLines[allLines.length - 1].length + 1;
    }

    const selected = model?.getValueInRange(new monaco.Range(start.line, start.column, end.line, end.column)) ?? "";
    const selectedLines = selected.split("\n");

    const blocks = getCodeBlocks(!code && !isEmpty ? selectedLines : allLines);

    const lines = selectedLines
      .map((text, i) => {
        const lineNumber = isEmpty ? i + start.line : i + 1;
        const block = blocks.find((x) => x[0] <= lineNumber && x[1] >= lineNumber);

        // If it is not a block, then just return the line
        if (!block) {
          // Ignore whitespace lines outside blocks
          if (text.trim().length === 0) {
            return [];
          }

          return [text];
        }

        const [blockStart, blockEnd] = block;

        // If it is not the block start, then ignore to avoid duplicating the lines
        // ...Unless it is a single line selection
        if (blockStart !== lineNumber && !isEmpty) {
          return [];
        }

        if (isEmpty) {
          return [...Array(blockEnd - blockStart + 1)].map((_, j) => allLines[blockStart + j - 1]);
        }

        return [...Array(blockEnd - blockStart + 1)].map((_, j) => selectedLines[i + j]);
      })
      .filter((x) => x.length > 0);

    // Execute first block
    this.executeLines(lines[0]);

    // Add to the queue the rest
    this.queue.push(...lines.slice(1));
  }

  async runAll() {
    const model = this.editor.getModel();

    await this.runCode(model?.getLinesContent() ?? []);
  }

  insertConsoleLine(text: string, prefix: string = "&gt;", color?: string) {
    this.console.innerHTML += html`<div class="monaco-component" ${styles({ color: color ?? "inherit" })}>
      <span class="opacity-40 select-none mr-1">${prefix}</span>${text.replace(/\s/g, "&nbsp;")}
    </div>`;

    setTimeout(() => {
      this.input.scrollIntoView({ behavior: "smooth" });
      this.enviroment.updateEnviroment();
      this.packages.updatePackages();
    }, 100);
  }
}

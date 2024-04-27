import { components, getComponent } from "../common/components";
import { html } from "../helpers";
import * as monaco from "monaco-editor";

export type Theme = {
  name: string;
  theme: {
    colors: Record<string, string>;
  };
};

export class Nav {
  private runButton = getComponent<HTMLButtonElement>("runCode");
  private runAllButton = getComponent<HTMLButtonElement>("runAll");
  private themeSelector = getComponent<HTMLSelectElement>("themeSelector");

  constructor(themes: Theme[]) {
    for (const { name } of themes) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      this.themeSelector.appendChild(option);
    }

    this.themeSelector.onchange = () => {
      this.setTheme(this.themeSelector.value);
    };
  }

  setTheme(theme: string) {
    this.themeSelector.value = theme;
    monaco.editor.setTheme(theme);
    localStorage.setItem("theme", theme);
  }

  setupButtons(runCode: (code?: string[]) => any, runAll: () => any) {
    this.runButton.addEventListener("click", runCode.bind(this, undefined));
    this.runAllButton.addEventListener("click", runAll);
  }

  toggleButtons(state: boolean) {
    this.runButton.disabled = state;
    this.runButton.disabled = state;
  }

  static render() {
    return html`
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
    `;
  }
}

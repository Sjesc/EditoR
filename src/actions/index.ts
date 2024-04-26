import { getCodeBlocks, html, styles } from "../helpers";
import Monaco, { setupRLanguage, themes } from "../common/monaco";
import { state } from "../main";
import { WebR } from "webr";
import { getComponent } from "../common/components";
import { KeyCode, KeyMod } from "monaco-editor";
import { captureROutput } from "../common/webR";

export const updateEnviroment = async () => {
  const rEnviroment = getComponent("enviroment");

  const baseShelter = await new state.webR.Shelter();

  const globalEnv = await captureROutput<string>(baseShelter, `print(ls.str(".GlobalEnv"))`);

  rEnviroment.innerHTML = "";

  globalEnv
    .filter((x) => !x.trim().startsWith("$"))
    .forEach((x) => {
      const [name, desc] = x.trim().split(" : ");

      const div = html`<div class="flex gap-x-1 overflow-hidden">
        <div>${name}</div>
        <div class="opacity-60 whitespace-nowrap text-ellipsis overflow-hidden">${desc}</div>
      </div>`;

      rEnviroment.innerHTML += div;
    });
};

export const updatePackages = async () => {
  const rPackages = getComponent("packages");

  const baseShelter = await new state.webR.Shelter();

  const packages = await captureROutput<string>(baseShelter, `print(.packages(TRUE))`);

  rPackages.innerHTML = "";

  packages
    .flatMap((x) => x.replace(/\[(\d)+\]/, "").split(/\s+/))
    .filter((x) => x.length > 0)
    .sort((a, b) => a.localeCompare(b))
    .forEach((x) => {
      const name = x.trim().slice(1, -1);

      const div = html`
        <div class="whitespace-nowrap monaco-component bg-black bg-opacity-30 rounded-lg px-2">${name}</div>
      `;

      rPackages.innerHTML += div;
    });
};

export const insertConsoleLine = (text: string, prefix: string = "&gt;", color?: string) => {
  const rConsole = getComponent("console");
  const rConsoleInput = getComponent("consoleInput");

  rConsole.innerHTML += html`<div class="monaco-component" ${styles({ color: color ?? "inherit" })}>
    <span class="opacity-40 select-none mr-1">${prefix}</span>${text}
  </div>`;

  setTimeout(() => {
    rConsoleInput.scrollIntoView({ behavior: "smooth" });
    updateEnviroment();
    updatePackages();
  }, 100);
};

export const runCode = async (code?: string) => {
  const runButton = getComponent<HTMLButtonElement>("runCode");

  if (runButton.disabled) {
    return;
  }
  const lines = [];

  if (!code) {
    const editor = Monaco.editor.getEditors()[0];
    const model = editor.getModel();

    const selection = editor.getSelection();

    if (!selection?.isEmpty()) {
      const selected = model?.getValueInRange(
        new Monaco.Range(
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
    lines.push(code);
  }

  const prefix = getComponent("consoleInputPrefix");

  lines.forEach((line, index) => {
    state.webR.writeConsole(line ?? "");

    runButton.disabled = true;
    prefix.innerHTML = "";

    insertConsoleLine(line ?? "", index === 0 ? "&gt;" : "+");
  });
};

export const setupEditor = async (webR: WebR) => {
  const editor = getComponent<HTMLDivElement>("editor");
  const themeSelector = getComponent<HTMLSelectElement>("themeSelector");

  const statusLine = getComponent("statusLine");
  const statusColumn = getComponent("statusColumn");

  await setupRLanguage(webR);

  const monacoEditor = Monaco.editor.create(editor, {
    value: [
      "data <- data.frame(x = 1:10, y = rnorm(10))",
      "summary(data)",
      "",
      "a <- function(x) {",
      '\tprint("x}")',
      "}",
      "",
      `text <- "This is a`,
      `{} ''`,
      `\\" multiline string"`,
    ].join("\n"),
    language: "r",
    fontFamily: "JetBrainsMono",
    fontLigatures: true,
    automaticLayout: true,
  });

  monacoEditor.onDidChangeCursorPosition((e) => {
    statusLine.innerHTML = e.position.lineNumber.toString();
    statusColumn.innerHTML = e.position.column.toString();
  });

  monacoEditor.addCommand(KeyMod.CtrlCmd | KeyCode.Enter, runCode.bind(null, undefined));

  themeSelector.onchange = () => {
    Monaco.editor.setTheme(themeSelector.value);

    localStorage.setItem("theme", themeSelector.value);
  };

  for (const { name } of themes) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = "theme: " + name;
    themeSelector.appendChild(option);
  }

  for (const { name, theme } of themes) {
    try {
      Monaco.editor.defineTheme(name, theme as any);
    } catch (e: any) {}
  }

  const defaultTheme = localStorage.getItem("theme") ?? "dracula";

  themeSelector.value = defaultTheme;
  Monaco.editor.setTheme(defaultTheme);
};

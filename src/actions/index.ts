import { getCodeBlocks } from "../helpers";
import Monaco, { setupRLanguage, themes } from "../common/monaco";
import { getComponent } from "../components";
import { state } from "../main";
import { WebR } from "webr";

export const runCode = async () => {
  const editor = Monaco.editor.getEditors()[0];
  const model = editor.getModel();

  const selection = editor.getSelection();

  const lines = [];

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

  console.log(lines);

  // Run lines

  // const rConsole = getComponent<HTMLDivElement>("console");

  for (const line of lines) {
    console.log(line);
    state.webR.writeConsole(line ?? "");
  }

  // const isAssignment = new RegExp(/^\w+\s*(<-|=)(.*)/).test(fullLine.trim());

  // const shelter = await new webR.Shelter();

  // lines.forEach((line, i) => {
  //   if (i === 0) {
  //     rConsole.innerHTML += html`<div><span class="opacity-40 select-none mr-1">&gt;</span>${line}</div>`;
  //   } else {
  //     rConsole.innerHTML += html`<div><span class="opacity-20 select-none mr-1">+</span>${line}</div>`;
  //   }
  // });

  // const result = await shelter.captureR(fullLine);

  // if (isAssignment) {
  //   return;
  // }

  // const stdout = result.output.filter((x) => x.type === "stdout").map((x) => x.data);

  // for (const out of stdout) {
  //   rConsole.innerHTML += html`<div>${out}</div>`;
  // }

  // const resultJs = await result.result.toJs();

  // if (resultJs.type === "character") {
  //   console.log(resultJs);

  //   for (const out of resultJs.values) {
  //     rConsole.innerHTML += html`<div class="opacity-70">${out}</div>`;
  //   }
  // }
};

export const setupEditor = async (webR: WebR) => {
  const editor = getComponent<HTMLDivElement>("editor");
  const themeSelector = getComponent<HTMLSelectElement>("themeSelector");

  await setupRLanguage(webR);

  Monaco.editor.create(editor, {
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
    automaticLayout: true,
  });

  themeSelector.onchange = () => {
    Monaco.editor.setTheme(themeSelector.value);
  };

  for (const { name } of themes) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    themeSelector.appendChild(option);
  }

  for (const { name, theme } of themes) {
    try {
      Monaco.editor.defineTheme(name, theme as any);
    } catch (e: any) {}
  }

  Monaco.editor.setTheme("dracula");
};

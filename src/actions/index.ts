import { WebR } from "webr";
import { html } from "../helpers";
import Monaco, { themes } from "../common/monaco";
import { getComponent } from "../components";

export const runCode = async (webR: WebR) => {
  const editor = Monaco.editor.getEditors()[0];
  const model = editor.getModel();
  const position = editor.getPosition();
  const lineNumber = position?.lineNumber ?? 1;

  const lines: string[] = [];
  const currentLine = model?.getLineContent(lineNumber)?.trim() ?? "";

  const isFunctionStart = currentLine.includes("function");
  const isFunctionEnd = !!currentLine.match('"}"')?.length;

  if (isFunctionStart && !isFunctionEnd) {
    const allLines = model?.getLinesContent() ?? [];

    let bracketLevel = 1;
    let isQuoting = false;
    let isDQuoting = false;
    let isEscaping = false;

    for (const line of allLines.slice(lineNumber - 1, allLines.length)) {
      lines.push(line);

      for (const char of line.split("")) {
        if (char === "\\") {
          isEscaping = !isEscaping;
          continue;
        }

        if (char === '"' && !isEscaping && !isQuoting) {
          isDQuoting = !isDQuoting;
          continue;
        }

        if (char === "'" && !isEscaping && !isDQuoting) {
          isQuoting = !isQuoting;
          continue;
        }

        if (char === "{" && !isDQuoting && !isQuoting) {
          bracketLevel += 1;
          continue;
        }

        if (char === "}" && !isDQuoting && !isQuoting) {
          bracketLevel -= 1;
        }
      }

      if (bracketLevel === 0) {
        break;
      }
    }
  } else if (!isFunctionStart && isFunctionEnd) {
  } else {
    lines.push(currentLine);
  }

  const rConsole = getComponent<HTMLDivElement>("console");

  const fullLine = lines.join(" ; ");

  const isAssignment = new RegExp(/^\w+\s*(<-|=)(.*)/).test(fullLine.trim());

  const shelter = await new webR.Shelter();

  lines.forEach((line, i) => {
    if (i === 0) {
      rConsole.innerHTML += html`<div><span class="opacity-40 select-none mr-1">&gt;</span>${line}</div>`;
    } else {
      rConsole.innerHTML += html`<div><span class="opacity-20 select-none mr-1">+</span>${line}</div>`;
    }
  });

  const result = await shelter.captureR(fullLine);

  if (isAssignment) {
    return;
  }

  const stdout = result.output.filter((x) => x.type === "stdout").map((x) => x.data);

  for (const out of stdout) {
    rConsole.innerHTML += html`<div>${out}</div>`;
  }

  const resultJs = await result.result.toJs();

  if (resultJs.type === "character") {
    console.log(resultJs);

    for (const out of resultJs.values) {
      rConsole.innerHTML += html`<div class="opacity-70">${out}</div>`;
    }
  }
};

export const setupEditor = async () => {
  const editor = getComponent<HTMLDivElement>("editor");
  const themeSelector = getComponent<HTMLSelectElement>("themeSelector");

  Monaco.editor.create(editor, {
    value: [
      "data <- data.frame(x = 1:10, y = rnorm(10))",
      "summary(data)",
      "",
      "a <- function(x) {",
      "\tprint(x)",
      "}",
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

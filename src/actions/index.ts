import * as monaco from "monaco-editor";
import { WebR } from "webr";
import { html } from "../helpers";

export const runCode = async (webR: WebR) => {
  const code = monaco.editor.getEditors()[0].getValue();
  const lines = code.split("\n");

  const terminal = document.getElementById("console")!;

  for (const line of lines) {
    const isAssignment = new RegExp(/^\w+\s*(<-|=)(.*)/).test(line.trim());

    const shelter = await new webR.Shelter();

    terminal.innerHTML =
      terminal.innerHTML +
      html`<div>
        <span class="opacity-40 select-none mr-1">&gt;</span>${line}
      </div>`;

    const result = await shelter.captureR(line);

    if (isAssignment) {
      continue;
    }

    const stdout = result.output
      .filter((x) => x.type === "stdout")
      .map((x) => x.data);

    for (const out of stdout) {
      terminal.innerHTML = terminal.innerHTML + html`<div>${out}</div>`;
    }

    const resultJs = await result.result.toJs();

    if (resultJs.type === "character") {
      console.log(resultJs);
      for (const out of resultJs.values) {
        terminal.innerHTML =
          terminal.innerHTML + html`<div class="opacity-70">${out}</div>`;
      }
    }
  }
};

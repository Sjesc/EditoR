import * as monaco from "monaco-editor";
import { WebR } from "webr";
import { html } from "../helpers";

export const runCode = async (webR: WebR) => {
  const code = monaco.editor.getEditors()[0].getValue();
  const lines = code.split("\n");

  const terminal = document.getElementById("console")!;

  for (const line of lines) {
    const shelter = await new webR.Shelter();

    terminal.innerHTML =
      terminal.innerHTML +
      html`<div>
        <span class="opacity-50 select-none mr-1">&gt;</span>${line}
      </div>`;

    const result = await shelter.captureR(line);

    const stdout = result.output
      .filter((x) => x.type === "stdout")
      .map((x) => x.data);

    for (const out of stdout) {
      terminal.innerHTML =
        terminal.innerHTML + terminal.append(html`<div>${out}</div>`);
    }

    console.log(result);
    console.log(await result.result.toJs());
  }
};

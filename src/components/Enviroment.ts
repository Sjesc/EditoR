import { WebR } from "webr";
import { components, getComponent } from "../common/components";
import { html, styles } from "../helpers";
import { captureROutput } from "../common/webR";

export class Enviroment {
  enviroment = getComponent<HTMLDivElement>("enviroment");

  private webR: WebR;

  constructor(webR: WebR) {
    this.webR = webR;
  }

  static render() {
    return html`<div
      class="flex flex-col overflow-hidden pb-2"
      ${styles({
        borderBottom: "1px solid var(--vscode-editorWidget-border)",
      })}
    >
      <div class="font-thin text-lg mb-1">Enviroment</div>
      <div id="${components.enviroment}" class="overflow-auto"></div>
    </div> `;
  }

  updateEnviroment = async () => {
    const baseShelter = await new this.webR.Shelter();

    const globalEnv = await captureROutput<string>(baseShelter, `print(ls.str(".GlobalEnv"))`);

    this.enviroment.innerHTML = "";

    globalEnv
      .filter((x) => !x.trim().startsWith("$"))
      .forEach((x) => {
        const [name, desc] = x.trim().split(" : ");

        const div = html`<div class="flex gap-x-1 overflow-hidden">
          <div>${name}</div>
          <div class="opacity-60 whitespace-nowrap text-ellipsis overflow-hidden font-thin">${desc}</div>
        </div>`;

        this.enviroment.innerHTML += div;
      });
  };
}

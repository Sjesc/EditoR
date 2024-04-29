//@ts-ignore
import { WebR } from "webr";
import { components, getComponent } from "../common/components";
import { html, styles } from "../helpers";
import { captureROutput } from "../common/webR";

export class Packages {
  packages = getComponent<HTMLDivElement>("packages");

  private webR: WebR;

  constructor(webR: WebR) {
    this.webR = webR;
  }

  static render() {
    return html`
      <div
        class="flex flex-col overflow-hidden pb-2"
        ${styles({
          borderBottom: "1px solid var(--vscode-editorWidget-border)",
        })}
      >
        <div class="font-thin text-lg mb-1">Packages</div>
        <div id="${components.packages}" class="overflow-auto flex gap-2 flex-wrap"></div>
      </div>
    `;
  }

  async updatePackages() {
    const shelter = await new this.webR.Shelter();

    const rPackages = await captureROutput<string>(shelter, `print(.packages(TRUE))`);

    this.packages.innerHTML = "";

    rPackages
      .flatMap((x) => x.replace(/\[(\d)+\]/, "").split(/\s+/))
      .filter((x) => x.length > 0)
      .sort((a, b) => a.localeCompare(b))
      .forEach((x) => {
        const name = x.trim().slice(1, -1);

        const div = html`
          <div
            class="whitespace-nowrap monaco-component bg-black text-white bg-opacity-40 rounded-lg px-2 font-thin text-sm"
          >
            ${name}
          </div>
        `;

        this.packages.innerHTML += div;
      });
  }
}

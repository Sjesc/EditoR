import { WebR } from "webr";
import { html, styles } from "../helpers";
import { Console } from "./Console";
import { Editor } from "./Editor";
import { Enviroment } from "./Enviroment";
import { Nav } from "./Nav";
import { Packages } from "./Packages";
import { Plots } from "./Plots";
import { StatusBar } from "./StatusBar";
import { getComponent } from "../common/components";
import { Theme } from "./Nav";

export class App {
  app = getComponent<HTMLDivElement>("app");

  private themes: Theme[];
  private theme: Theme["theme"];

  private webR?: WebR;
  private editor?: Editor;
  private plots?: Plots;
  private statusBar?: StatusBar;
  private enviroment?: Enviroment;
  private packages?: Packages;
  private console?: Console;
  private nav?: Nav;

  constructor(themes: Theme[]) {
    const themeName = localStorage.getItem("theme") ?? "dracula";
    this.themes = themes;
    this.theme = themes.find((x) => x.name === themeName)?.theme ?? themes[0].theme;

    this.renderLoading();
  }

  async init() {
    this.webR = new WebR();
    await this.webR.init();

    await this.webR.evalRVoid("webr::shim_install()");
    await this.webR.evalRVoid("options(device=webr::canvas)");

    this.render();

    this.plots = new Plots();
    this.enviroment = new Enviroment(this.webR);
    this.packages = new Packages(this.webR);
    this.nav = new Nav(this.themes);

    this.editor = new Editor(this.webR, this.nav, this.themes);
    await this.editor.init();

    this.statusBar = new StatusBar(this.editor.standaloneEditor!);

    this.console = new Console(
      this.webR,
      this.plots,
      this.packages,
      this.enviroment,
      this.nav,
      this.editor.standaloneEditor!
    );
    await this.console.init();
  }

  renderLoading() {
    this.app.innerHTML = html`<div
      class="flex flex-col items-center justify-center h-screen "
      ${styles({
        backgroundColor: this.theme.colors["editor.background"],
        color: this.theme.colors["editor.foreground"],
      })}
    >
      <div class="mb-8 opacity-70 text-xl font-thin">Loading...</div>
      <div class="loader">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    </div>`;
  }

  render() {
    this.app.innerHTML = html`
      <div
        class="w-full h-full"
        ${styles({
          backgroundColor: this.theme.colors["editor.background"],
          color: this.theme.colors["editor.foreground"],
        })}
      >
        <div
          class="w-full h-full flex flex-col monaco-component"
          ${styles({
            backgroundColor: "var(--vscode-editor-background)",
            color: "var(--vscode-editor-foreground)",
          })}
        >
          ${Nav.render()}

          <div class="flex flex-1 overflow-hidden">
            <div class="flex flex-col flex-1">${Editor.render()} ${StatusBar.render()} ${Console.render()}</div>

            <aside
              class="w-[500px] grid gap-y-4 p-4 monaco-component overflow-hidden"
              ${styles({
                gridTemplateRows: "1fr 1fr 3fr",
                borderLeft: "1px solid var(--vscode-editorWidget-border)",
              })}
            >
              ${Enviroment.render()} ${Packages.render()} ${Plots.render()}
            </aside>
          </div>
        </div>
      </div>
    `;
  }
}

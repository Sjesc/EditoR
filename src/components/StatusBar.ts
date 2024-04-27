import { components, getComponent } from "../common/components";
import { html } from "../helpers";
import * as monaco from "monaco-editor";

export class StatusBar {
  statusLine = getComponent("statusLine");
  statusColumn = getComponent("statusColumn");

  private editor: monaco.editor.IStandaloneCodeEditor;

  constructor(editor: monaco.editor.IStandaloneCodeEditor) {
    this.editor = editor;

    this.editor.onDidChangeCursorPosition((e) => {
      this.statusLine.innerHTML = e.position.lineNumber.toString();
      this.statusColumn.innerHTML = e.position.column.toString();
    });
  }

  static render() {
    return html`<div class="h-[24px] px-4 text-xs flex items-center bg-black bg-opacity-10">
      <div>Ln <span id="${components.statusLine}">1</span>, Col <span id="${components.statusColumn}">1</span></div>
    </div>`;
  }
}

import { components, getComponent } from "../common/components";
import { html } from "../helpers";

export class Plots {
  private plots = getComponent("plots");
  private canvas?: HTMLCanvasElement;

  static render() {
    return html`
      <div class="flex flex-col overflow-hidden">
        <div class="font-thin text-lg mb-1">Plots</div>
        <div class="bg-white flex overflow-auto gap-x-2 flex-wrap" id="${components.plots}"></div>
      </div>
    `;
  }

  addPlot(output: { data?: { event: string; image: CanvasImageSource } }) {
    if (output.data?.event === "canvasImage") {
      this.canvas?.getContext("2d")?.drawImage(output.data.image, 0, 0);
    } else if (output.data?.event === "canvasNewPage") {
      // Create a new canvas element
      this.canvas = document.createElement("canvas");
      this.canvas.setAttribute("width", "1008");
      this.canvas.setAttribute("height", "1008");
      this.canvas.style.width = `${this.plots.clientWidth}px`;
      this.canvas.style.height = `${this.plots.clientWidth}px`;
      this.canvas.style.display = "inline-block";
      this.plots.innerHTML = "";
      this.plots.appendChild(this.canvas);
    }
  }
}

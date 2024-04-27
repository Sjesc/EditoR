import "./style.css";

const themesPs = import.meta.glob("./themes/*.json");

import { App } from "./components/App.ts";

export const loadThemes = () =>
  Promise.all(
    Object.entries(themesPs).map(async ([path, loadTheme]) => {
      const theme = (await loadTheme()) as {
        colors: Record<string, string>;
      };

      const [_, __, fileName] = path.split("/");
      const themeName = fileName.split(".")[0];
      const name = themeName.replace(/\s/g, "").toLowerCase();

      return { name, theme };
    })
  );

export const themes = await loadThemes();

const app = new App(themes);
app.init();

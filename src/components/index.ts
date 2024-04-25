export const components = {
  app: "app",
  editor: "editor",
  themeSelector: "theme-selector",
  runCode: "run-code",
  console: "console",
} as const;

export type ComponentName = keyof typeof components;

export function getComponent<T = HTMLElement>(name: ComponentName): T {
  return document.getElementById(components[name])! as T;
}

export const updateComponent = (name: ComponentName, html: string) => {
  document.getElementById(components[name])!.innerHTML = html;
};

export const appendComponent = (name: ComponentName, html: string) => {
  document.getElementById(components[name])!.innerHTML += html;
};

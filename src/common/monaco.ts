import * as Monaco from "monaco-editor";

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import { RFunction, WebR } from "webr";
import { captureROutput } from "./webR";
import { getTokensProvider } from "../config/tokensProvider";

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "json") {
      return new jsonWorker();
    }
    if (label === "css" || label === "scss" || label === "less") {
      return new cssWorker();
    }
    if (label === "html" || label === "handlebars" || label === "razor") {
      return new htmlWorker();
    }
    if (label === "typescript" || label === "javascript") {
      return new tsWorker();
    }
    return new editorWorker();
  },
};

export default Monaco;

export const setupRLanguage = async (webR: WebR) => {
  const baseShelter = await new webR.Shelter();

  const baseFunctionsDefs = await captureROutput<string>(baseShelter, `print(lsf.str("package:base"))`);
  const statsFunctionsDefs = await captureROutput<string>(baseShelter, `print(lsf.str("package:stats"))`);

  const fnDefs = [...baseFunctionsDefs, ...statsFunctionsDefs]
    .map((x) => x.trim())
    .filter((x) => x.includes(" : function") && x.endsWith(")"))
    .map((x) => {
      return x.split(" : function ");
    })
    .reduce((acc, curr) => {
      const [name, str] = curr;

      const params = str.slice(1).slice(0, -1).split(", ");
      return { ...acc, [name]: params };
    }, {} as Record<string, string[]>);

  Monaco.languages.setLanguageConfiguration("r", {
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "'", close: "'" },
      { open: '"', close: '"' },
    ],
    wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\<\>\/\?\s]+)/g,
  });

  Monaco.languages.setMonarchTokensProvider("r", (await getTokensProvider()) as any);

  Monaco.languages.registerSignatureHelpProvider("r", {
    signatureHelpTriggerCharacters: ["(", ","],
    async provideSignatureHelp(model, position) {
      const line = model.getLineContent(position.lineNumber);
      const column = position.column;
      const selected = line.slice(0, column);
      const end = selected.lastIndexOf("(");
      const words = [...selected.slice(0, end).matchAll(/[a-zA-Z0-9_.:]*/g)]
        .map((x) => x[0])
        .filter((x) => x.length > 0);

      const token = words[words.length - 1];
      const parameters = selected.slice(end + 1, column - 1).split(",");

      const shelter = await new webR.Shelter();

      const result = await shelter.captureR(`tools:::Rd2txt(utils:::.getHelpFile(as.character(help(${token}))))`);

      const helpText = result.output
        .filter((x) => x.type === "stdout")
        .map((x) => x.data.replace(/[^a-z0-9 ,.?!]/gi, ""))
        .join("\n");

      const fnParams = fnDefs[token];

      return {
        value: {
          activeParameter: parameters.length - 1,
          activeSignature: 0,
          signatures: [
            {
              label: `${token}(${fnParams?.join(", ")})`,
              documentation: helpText,
              parameters: fnParams.map((x) => ({
                label: x,
                documentation: "",
              })),
            },
          ] as any,
        },
        dispose() {},
      };
    },
  });

  Monaco.languages.registerHoverProvider("r", {
    async provideHover(model, position) {
      const shelter = await new webR.Shelter();

      const word = model.getWordAtPosition(position)?.word;

      if (!word) {
        return;
      }

      const result = await shelter.captureR(`tools:::Rd2txt(utils:::.getHelpFile(as.character(help(${word}))))`);

      const helpText = result.output
        .filter((x) => x.type === "stdout")
        .map((x) => x.data.replace(/[^a-z0-9 ,.?!]/gi, ""))
        .join("\n");

      return {
        contents: [{ value: helpText }],
      };
    },
  });

  Monaco.languages.registerCompletionItemProvider("r", {
    provideCompletionItems: async (model: Monaco.editor.ITextModel, position: Monaco.Position) => {
      const shelter = await new webR.Shelter();

      const lineNumber = position.lineNumber;
      const line = model.getLineContent(lineNumber);

      const column = position.column;
      const selected = line.slice(0, column);

      const words = [...selected.matchAll(/[a-zA-Z0-9_.:]*/g)].map((x) => x[0]).filter((x) => x.length > 0);

      const token = words[words.length - 1];
      const start = selected.lastIndexOf(token);
      const end = start + token.length;

      const assignLinebuffer = (await shelter.evalR("utils:::.assignLinebuffer")) as RFunction;
      const assignToken = (await shelter.evalR("utils:::.assignToken")) as RFunction;
      const assignStart = (await shelter.evalR("utils:::.assignStart")) as RFunction;
      const assignEnd = (await shelter.evalR("utils:::.assignEnd")) as RFunction;
      const completeToken = (await shelter.evalR("utils:::.completeToken")) as RFunction;
      const retrieveCompletions = (await shelter.evalR("utils:::.retrieveCompletions")) as RFunction;

      await assignLinebuffer(line);
      await assignToken(token);
      await assignStart(start + 1);
      await assignEnd(end + 1);
      await completeToken();

      const result = (await retrieveCompletions()) as { values: string[] };

      const suggestions = result.values.map((x: any) => ({
        label: x,
        kind: Monaco.languages.CompletionItemKind.Function,
        insertText: x,
      }));

      return { suggestions } as Monaco.languages.CompletionList;
    },
  });
};

import * as monaco from "monaco-editor";

const themesPs = import.meta.glob("../themes/*.json");

import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import cssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import htmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import tsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import { RFunction, WebR } from "webr";

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

const themes = await Promise.all(
  Object.entries(themesPs).map(async ([path, loadTheme]) => {
    const theme = await loadTheme();

    const [_, __, fileName] = path.split("/");
    const themeName = fileName.split(".")[0];
    const name = themeName.replace(/\s/g, "").toLowerCase();

    return { name, theme };
  })
);

export const setupEditor = async (
  element: HTMLElement,
  themeElement: HTMLSelectElement,
  webr: WebR
) => {
  const baseShelter = await new webr.Shelter();

  const getTokens = (await baseShelter.evalR(`ls`)) as RFunction;
  const getFunctionsDefs = (await baseShelter.evalR(`lsf.str`)) as RFunction;

  const baseTokensResult = (await getTokens("package:base")) as any;
  const baseTokens = baseTokensResult.values as string[];

  const statsTokensResult = (await getTokens("package:stats")) as any;
  const statsTokens = statsTokensResult.values as string[];
  const tokens = [...baseTokens, ...statsTokens];

  const baseFunctionsDefs = (
    await baseShelter.captureR(`print(lsf.str("package:base"))`)
  ).output as { type: string; data: string }[];

  const statsFunctionsDefs = (
    await baseShelter.captureR(`print(lsf.str("package:stats"))`)
  ).output as { type: string; data: string }[];

  const fnDefs = [...baseFunctionsDefs, ...statsFunctionsDefs]
    .map((x) => x.data.trim())
    .filter((x) => x.includes(" : function") && x.endsWith(")"))
    .map((x) => {
      return x.split(" : function ");
    })
    .reduce((acc, curr) => {
      const [name, str] = curr;

      const params = str.slice(1).slice(0, -1).split(", ");
      return { ...acc, [name]: params };
    }, {} as Record<string, string[]>);

  monaco.languages.setLanguageConfiguration("r", {
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: "'", close: "'" },
      { open: '"', close: '"' },
    ],
    wordPattern:
      /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\<\>\/\?\s]+)/g,
  });

  monaco.languages.setMonarchTokensProvider("r", {
    defaultToken: "",
    tokenPostfix: ".r",

    roxygen: [
      "@alias",
      "@aliases",
      "@assignee",
      "@author",
      "@backref",
      "@callGraph",
      "@callGraphDepth",
      "@callGraphPrimitives",
      "@concept",
      "@describeIn",
      "@description",
      "@details",
      "@docType",
      "@encoding",
      "@evalNamespace",
      "@evalRd",
      "@example",
      "@examples",
      "@export",
      "@exportClass",
      "@exportMethod",
      "@exportPattern",
      "@family",
      "@field",
      "@formals",
      "@format",
      "@import",
      "@importClassesFrom",
      "@importFrom",
      "@importMethodsFrom",
      "@include",
      "@inherit",
      "@inheritDotParams",
      "@inheritParams",
      "@inheritSection",
      "@keywords",
      "@md",
      "@method",
      "@name",
      "@noMd",
      "@noRd",
      "@note",
      "@param",
      "@rawNamespace",
      "@rawRd",
      "@rdname",
      "@references",
      "@return",
      "@S3method",
      "@section",
      "@seealso",
      "@setClass",
      "@slot",
      "@source",
      "@template",
      "@templateVar",
      "@title",
      "@TODO",
      "@usage",
      "@useDynLib",
    ],

    constants: [
      "NULL",
      "FALSE",
      "TRUE",
      "NA",
      "Inf",
      "NaN",
      "NA_integer_",
      "NA_real_",
      "NA_complex_",
      "NA_character_",
      "T",
      "F",
      "LETTERS",
      "letters",
      "month.abb",
      "month.name",
      "pi",
      "R.version.string",
    ],

    keywords: [
      "break",
      "next",
      "return",
      "if",
      "else",
      "for",
      "in",
      "repeat",
      "while",
      "array",
      "category",
      "character",
      "complex",
      "double",
      "function",
      "integer",
      "list",
      "logical",
      "matrix",
      "numeric",
      "vector",
      "factor",
      "library",
      "require",
      "attach",
      "detach",
      "source",
    ],

    functions: [...tokens, "data.frame"],

    special: [
      "\\n",
      "\\r",
      "\\t",
      "\\b",
      "\\a",
      "\\f",
      "\\v",
      "\\'",
      '\\"',
      "\\\\",
    ],

    brackets: [
      { open: "{", close: "}", token: "delimiter.curly" },
      { open: "[", close: "]", token: "delimiter.bracket" },
      { open: "(", close: ")", token: "delimiter.parenthesis" },
    ],

    tokenizer: {
      root: [
        { include: "@numbers" },
        { include: "@strings" },

        [/[{}\[\]()]/, "@brackets"],

        { include: "@operators" },
        [/#'$/, "comment.doc"],
        [/#'/, "comment.doc", "@roxygen"],
        [/(^#.*$)/, "comment"],

        [/\s+/, "white"],

        [/[,:;]/, "delimiter"],

        [/@[a-zA-Z]\w*/, "tag"],
        [
          /[a-zA-Z.]\w*/,
          {
            cases: {
              "@functions": "entity.name.function",
              "@keywords": "keyword",
              "@constants": "constant",
              "@default": "identifier",
            },
          },
        ],
      ],

      // Recognize Roxygen comments
      roxygen: [
        [
          /@\w+/,
          {
            cases: {
              "@roxygen": "tag",
              "@eos": { token: "comment.doc", next: "@pop" },
              "@default": "comment.doc",
            },
          },
        ],
        [
          /\s+/,
          {
            cases: {
              "@eos": { token: "comment.doc", next: "@pop" },
              "@default": "comment.doc",
            },
          },
        ],
        [/.*/, { token: "comment.doc", next: "@pop" }],
      ],

      // Recognize positives, negatives, decimals, imaginaries, and scientific notation
      numbers: [
        [/0[xX][0-9a-fA-F]+/, "number.hex"],
        [/-?(\d*\.)?\d+([eE][+\-]?\d+)?/, "number"],
      ],

      // Recognize operators
      operators: [
        [/<{1,2}-/, "operator"],
        [/->{1,2}/, "operator"],
        [/%[^%\s]+%/, "operator"],
        [/\*\*/, "operator"],
        [/%%/, "operator"],
        [/&&/, "operator"],
        [/\|\|/, "operator"],
        [/<</, "operator"],
        [/>>/, "operator"],
        [/[-+=&|!<>^~*/:$]/, "operator"],
      ],

      // Recognize strings, including those broken across lines
      strings: [
        [/'/, "string.escape", "@stringBody"],
        [/"/, "string.escape", "@dblStringBody"],
      ],
      stringBody: [
        [
          /\\./,
          {
            cases: {
              "@special": "string",
              "@default": "error-token",
            },
          },
        ],
        [/'/, "string.escape", "@popall"],
        [/./, "string"],
      ],
      dblStringBody: [
        [
          /\\./,
          {
            cases: {
              "@special": "string",
              "@default": "error-token",
            },
          },
        ],
        [/"/, "string.escape", "@popall"],
        [/./, "string"],
      ],
    },
  });

  monaco.languages.registerSignatureHelpProvider("r", {
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

      const shelter = await new webr.Shelter();

      const result = await shelter.captureR(
        `tools:::Rd2txt(utils:::.getHelpFile(as.character(help(${token}))))`
      );

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

  monaco.languages.registerHoverProvider("r", {
    async provideHover(model, position) {
      const shelter = await new webr.Shelter();

      const word = model.getWordAtPosition(position)?.word;

      if (!word) {
        return;
      }

      const result = await shelter.captureR(
        `tools:::Rd2txt(utils:::.getHelpFile(as.character(help(${word}))))`
      );

      const helpText = result.output
        .filter((x) => x.type === "stdout")
        .map((x) => x.data.replace(/[^a-z0-9 ,.?!]/gi, ""))
        .join("\n");

      return {
        contents: [{ value: helpText }],
      };
    },
  });

  monaco.languages.registerCompletionItemProvider("r", {
    provideCompletionItems: async (
      model: monaco.editor.ITextModel,
      position: monaco.Position
    ) => {
      const shelter = await new webr.Shelter();

      const lineNumber = position.lineNumber;
      const line = model.getLineContent(lineNumber);

      const column = position.column;
      const selected = line.slice(0, column);

      const words = [...selected.matchAll(/[a-zA-Z0-9_.:]*/g)]
        .map((x) => x[0])
        .filter((x) => x.length > 0);

      const token = words[words.length - 1];
      const start = selected.lastIndexOf(token);
      const end = start + token.length;

      const assignLinebuffer = (await shelter.evalR(
        "utils:::.assignLinebuffer"
      )) as RFunction;
      const assignToken = (await shelter.evalR(
        "utils:::.assignToken"
      )) as RFunction;
      const assignStart = (await shelter.evalR(
        "utils:::.assignStart"
      )) as RFunction;
      const assignEnd = (await shelter.evalR(
        "utils:::.assignEnd"
      )) as RFunction;
      const completeToken = (await shelter.evalR(
        "utils:::.completeToken"
      )) as RFunction;
      const retrieveCompletions = (await shelter.evalR(
        "utils:::.retrieveCompletions"
      )) as RFunction;

      await assignLinebuffer(line);
      await assignToken(token);
      await assignStart(start + 1);
      await assignEnd(end + 1);
      await completeToken();

      const result = (await retrieveCompletions()) as { values: string[] };

      const suggestions = result.values.map((x: any) => ({
        label: x,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: x,
      }));

      return { suggestions } as monaco.languages.CompletionList;
    },
  });

  monaco.editor.create(element, {
    value: `data <- data.frame(x = 1:10, y = rnorm(10))\nsummary(data)`,
    language: "r",
    automaticLayout: true,
  });

  themeElement.onchange = () => {
    monaco.editor.setTheme(themeElement.value);
  };

  for (const { name } of themes) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    themeElement.appendChild(option);
  }

  for (const { name, theme } of themes) {
    try {
      monaco.editor.defineTheme(name, theme as any);
    } catch (e: any) {}
  }

  monaco.editor.setTheme("dracula");
};

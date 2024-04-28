import { WebR } from "webr";
import { callRFunction } from "../common/webR";

const keywords = [
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
];

export const getTokensProvider = async (webR: WebR) => {
  const baseTokens = await callRFunction<string>(webR, "getTokens", "package:base");
  const statsTokens = await callRFunction<string>(webR, "getTokens", "package:stats");

  const tokens = [...baseTokens.values, ...statsTokens.values];

  return {
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

    keywords: keywords,

    functions: [...tokens.filter((x) => !keywords.includes(x)), "data.frame"],

    special: ["\\n", "\\r", "\\t", "\\b", "\\a", "\\f", "\\v", "\\'", '\\"', "\\\\"],

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
          /[a-zA-Z.0-9]*/,
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
        [/`/, "string.escape", "@bStringBody"],
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
      bStringBody: [
        [
          /\\./,
          {
            cases: {
              "@special": "string",
              "@default": "error-token",
            },
          },
        ],
        [/`/, "string.escape", "@popall"],
        [/./, "string"],
      ],
    },
  };
};

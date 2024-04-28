import { CSSProperties } from "react";

export const html = String.raw;

export const styles = (styles: CSSProperties) => {
  const keys = Object.keys(styles) as (keyof CSSProperties)[];

  const value = keys
    .map((key) => {
      const newKey = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
      return `${newKey}: ${styles[key]};`;
    })
    .join("");

  return `style="${value}"`;
};

const blockTypes = [
  { name: "braces", start: "{", end: "}", ignoreContent: false },
  { name: "parens", start: "(", end: ")", ignoreContent: false },
  { name: "quotes", start: "'", end: "'", ignoreContent: true },
  { name: "dQuotes", start: '"', end: '"', ignoreContent: true },
  { name: "comment", start: "#", end: "\n", ignoreContent: true },
] as const;

const operators = [
  "+",
  "-",
  "*",
  "/",
  "=",
  "<",
  ">",
  "!",
  "&",
  "|",
  "^",
  "~",
  "?",
  ":",
  ".",
  ",",
  ";",
  "[",
  "]",
] as const;

type BlockType = (typeof blockTypes)[number];
type BlockName = BlockType["name"] | "operator";
export type CodeBlock = [number, number, BlockName];

export const getCodeBlocks = (lines: string[]): CodeBlock[] => {
  const blocks = [] as CodeBlock[];

  const state = {
    current: null as BlockType | null,
    ignorable: null as BlockType | null,
    currentLevel: 0,
    start: 0,
    end: 0,
    operatorStart: 0 as number | null,
    operatorEnd: 0 as number | null,
    isOperating: false,
    isEscaping: false,
  };

  lines.forEach((line, i) => {
    const lineNumber = i + 1;

    const isEmpty = line.trim().length === 0;

    if (state.isOperating && !isEmpty) {
      state.isOperating = false;
      state.operatorEnd = lineNumber;

      const lastBlock = blocks[blocks.length - 1];

      if (lastBlock[1] === state.operatorStart && lastBlock[2] === "operator") {
        blocks[blocks.length - 1] = [lastBlock[0], state.operatorEnd, "operator"];
      } else {
        blocks.push([state.operatorStart!, state.operatorEnd, "operator"]);
      }
    }

    if (!state.isOperating) {
      state.operatorStart = null;
      state.operatorEnd = null;
    }

    line.split("").forEach((char) => {
      const isOperator = operators.includes(char as any);

      if (!isOperator) {
        state.isOperating = false;
      }

      // Escaping
      if (state.isEscaping) {
        state.isEscaping = false;
        return;
      }

      if (char === "\\") {
        state.isEscaping = true;
        return;
      }

      // Blocks
      const block = blockTypes.find((x) => x.start === char || x.end === char);

      if (!block && !isOperator) {
        return;
      }

      const isBlockStart = block?.start === char;
      const isBlockEnd = block?.end === char;

      const isIgnoreEnd = isBlockEnd && block.name === state.ignorable?.name;

      // Ignore content inside quotes, comments, etc..
      if (state.ignorable !== null) {
        if (isIgnoreEnd) {
          state.ignorable = null;
        } else {
          return;
        }
      }

      // Operator

      if (isOperator) {
        state.isOperating = true;

        if (state.operatorStart === null) {
          state.operatorStart = lineNumber;
        }
        return;
      }

      // Block end
      if (isBlockEnd && state.current?.name === block.name) {
        state.currentLevel -= 1;

        if (state.currentLevel === 0) {
          state.end = lineNumber;

          // Save if the block is multiline
          if (state.start !== state.end) {
            blocks.push([state.start, state.end, state.current.name]);
          }

          state.current = null;
        }

        return;
      }

      // Block start
      if (isBlockStart) {
        // Add as ignorable if block is ignorable
        if (block.ignoreContent && state.ignorable === null && !isIgnoreEnd) {
          state.ignorable = block;
        }

        if (state.current === null) {
          state.current = block;
          state.start = lineNumber;
        }

        if (state.current.name === block.name) {
          state.currentLevel += 1;
        }
      }
    });
  });

  return blocks;
};

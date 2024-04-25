import { Position } from "monaco-editor";
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

interface SimplePosition {
  line: number;
  column: number;
}

export const getMatchingBrackets = (code: string): [SimplePosition, SimplePosition][] => {
  const matches: [SimplePosition, SimplePosition][] = [];

  const lines = code.split("\r\n");

  let bracketLevel = 0;
  let isQuoting = false;
  let isDQuoting = false;
  let isEscaping = false;

  let start: SimplePosition = { line: 0, column: 0 };
  let end: SimplePosition = { line: 0, column: 0 };

  lines.forEach((line, lineNumber) => {
    line.split("").forEach((char, column) => {
      if (char === "\\") {
        isEscaping = !isEscaping;
        return;
      }

      if (char === '"' && !isEscaping && !isQuoting) {
        isDQuoting = !isDQuoting;
        return;
      }

      if (char === "'" && !isEscaping && !isDQuoting) {
        isQuoting = !isQuoting;
        return;
      }

      if (char === "{" && !isDQuoting && !isQuoting) {
        start;
        bracketLevel += 1;
        return;
      }

      if (char === "}" && !isDQuoting && !isQuoting) {
        bracketLevel -= 1;
      }
    });
  });

  return [
    [
      { line: 1, column: 1 },
      { line: 1, column: 1 },
    ],
  ];
};

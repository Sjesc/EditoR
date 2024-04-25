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

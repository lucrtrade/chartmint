import { CompileError, type SourceLoc } from "../errors";

export type TokenKind =
  | "ident"
  | "number"
  | "comma"
  | "dot"
  | "plus"
  | "minus"
  | "star"
  | "slash"
  | "lparen"
  | "rparen"
  | "lt"
  | "gt"
  | "le"
  | "ge"
  | "eq"
  | "newline"
  | "eof";

export type Token = { kind: TokenKind; value: string; loc: SourceLoc };

const SINGLE_CHAR: Record<string, TokenKind> = {
  ",": "comma",
  ".": "dot",
  "+": "plus",
  "-": "minus",
  "*": "star",
  "/": "slash",
  "(": "lparen",
  ")": "rparen",
  "=": "eq",
};

export function tokenize(source: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let col = 1;
  let lastEmittedNewline = false;

  const push = (kind: TokenKind, value: string, loc: SourceLoc) => {
    if (kind === "newline") {
      if (lastEmittedNewline || tokens.length === 0) return;
      lastEmittedNewline = true;
    } else {
      lastEmittedNewline = false;
    }
    tokens.push({ kind, value, loc });
  };

  while (i < source.length) {
    const ch = source[i]!;

    if (ch === " " || ch === "\t" || ch === "\r") {
      i++;
      col++;
      continue;
    }

    if (ch === "#") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }

    if (ch === "\n") {
      push("newline", "\n", { line, col, length: 1 });
      i++;
      line++;
      col = 1;
      continue;
    }

    if (ch === "<" || ch === ">") {
      if (source[i + 1] === "=") {
        push(ch === "<" ? "le" : "ge", ch + "=", { line, col, length: 2 });
        i += 2;
        col += 2;
        continue;
      }
      push(ch === "<" ? "lt" : "gt", ch, { line, col, length: 1 });
      i++;
      col++;
      continue;
    }

    if (SINGLE_CHAR[ch]) {
      push(SINGLE_CHAR[ch]!, ch, { line, col, length: 1 });
      i++;
      col++;
      continue;
    }

    if (isDigit(ch)) {
      const start = i;
      const startCol = col;
      while (i < source.length && isDigit(source[i]!)) {
        i++;
        col++;
      }
      if (source[i] === ".") {
        i++;
        col++;
        while (i < source.length && isDigit(source[i]!)) {
          i++;
          col++;
        }
      }
      push("number", source.slice(start, i), { line, col: startCol, length: i - start });
      continue;
    }

    if (isIdentStart(ch)) {
      const start = i;
      const startCol = col;
      while (i < source.length && isIdentPart(source[i]!)) {
        i++;
        col++;
      }
      push("ident", source.slice(start, i), { line, col: startCol, length: i - start });
      continue;
    }

    throw new CompileError("lex", `unexpected character '${ch}'`, { line, col, length: 1 });
  }

  tokens.push({ kind: "eof", value: "", loc: { line, col, length: 0 } });
  return tokens;
}

function isDigit(ch: string): boolean {
  return ch >= "0" && ch <= "9";
}
function isIdentStart(ch: string): boolean {
  return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_";
}
function isIdentPart(ch: string): boolean {
  return isIdentStart(ch) || isDigit(ch);
}

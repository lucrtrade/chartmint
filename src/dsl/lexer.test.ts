import { describe, expect, it } from "vitest";
import { tokenize } from "./lexer";

describe("tokenize", () => {
  it("tokenizes a minimal header", () => {
    const tokens = tokenize("pattern foo\nbars a, b, c\n");
    expect(tokens.map((t) => t.kind)).toEqual([
      "ident",
      "ident",
      "newline",
      "ident",
      "ident",
      "comma",
      "ident",
      "comma",
      "ident",
      "newline",
      "eof",
    ]);
    expect(tokens[0].value).toBe("pattern");
    expect(tokens[1].value).toBe("foo");
  });

  it("tracks line and column", () => {
    const tokens = tokenize("ab\n  cd");
    expect(tokens[0]).toMatchObject({ value: "ab", loc: { line: 1, col: 1, length: 2 } });
    expect(tokens[2]).toMatchObject({ value: "cd", loc: { line: 2, col: 3, length: 2 } });
  });

  it("recognizes numbers including decimals", () => {
    const tokens = tokenize("0.65 12 1.0");
    expect(tokens.slice(0, 3).map((t) => ({ kind: t.kind, value: t.value }))).toEqual([
      { kind: "number", value: "0.65" },
      { kind: "number", value: "12" },
      { kind: "number", value: "1.0" },
    ]);
  });

  it("recognizes operators and punctuation", () => {
    const tokens = tokenize("a.high < c.low + 1 * (2 - 3) / 4 = >=");
    const kinds = tokens.map((t) => t.kind);
    expect(kinds).toContain("dot");
    expect(kinds).toContain("lt");
    expect(kinds).toContain("plus");
    expect(kinds).toContain("star");
    expect(kinds).toContain("lparen");
    expect(kinds).toContain("rparen");
    expect(kinds).toContain("minus");
    expect(kinds).toContain("slash");
    expect(kinds).toContain("eq");
    expect(kinds).toContain("ge");
  });

  it("skips line comments starting with #", () => {
    const tokens = tokenize("pattern foo # this is a comment\nbars a");
    const values = tokens.filter((t) => t.kind === "ident").map((t) => t.value);
    expect(values).toEqual(["pattern", "foo", "bars", "a"]);
  });

  it("collapses repeated newlines", () => {
    const tokens = tokenize("a\n\n\nb");
    const newlines = tokens.filter((t) => t.kind === "newline");
    expect(newlines).toHaveLength(1);
  });

  it("throws CompileError on unknown char", () => {
    expect(() => tokenize("@@@")).toThrow(/unexpected character/i);
  });
});

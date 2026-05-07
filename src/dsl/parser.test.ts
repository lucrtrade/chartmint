import { describe, expect, it } from "vitest";
import { parse } from "./parser";
import { tokenize } from "./lexer";

function parseText(source: string) {
  return parse(tokenize(source), source);
}

describe("parse: header", () => {
  it("parses minimal header", () => {
    const { program, errors } = parseText("pattern fvg\nbars a, b, c\n");
    expect(errors).toEqual([]);
    expect(program?.pattern).toBe("fvg");
    expect(program?.bars).toEqual(["a", "b", "c"]);
    expect(program?.series).toBe(30);
    expect(program?.seed).toBe("random");
  });

  it("parses series and seed", () => {
    const { program, errors } = parseText("pattern p\nbars a\nseries 50\nseed 42\n");
    expect(errors).toEqual([]);
    expect(program?.series).toBe(50);
    expect(program?.seed).toBe(42);
  });

  it("accepts seed random", () => {
    const { program } = parseText("pattern p\nbars a\nseed random\n");
    expect(program?.seed).toBe("random");
  });

  it("errors when pattern is missing", () => {
    const { errors } = parseText("bars a\n");
    expect(errors[0]?.message).toMatch(/expected 'pattern'/i);
  });
});

describe("parse: statements", () => {
  it("parses must with compare predicate", () => {
    const { program, errors } = parseText("pattern p\nbars a, b, c\nmust a.high < c.low\n");
    expect(errors).toEqual([]);
    expect(program?.statements).toHaveLength(1);
    const stmt = program!.statements[0]!;
    expect(stmt.kind).toBe("must");
  });

  it("parses must with direction predicate", () => {
    const { program } = parseText("pattern p\nbars a\nmust direction(a) = bullish\n");
    const stmt = program!.statements[0]!;
    expect(stmt.kind).toBe("must");
    if (stmt.kind === "must" && stmt.predicate.kind === "direction") {
      expect(stmt.predicate.bar).toBe("a");
      expect(stmt.predicate.direction).toBe("bullish");
    }
  });

  it("parses should hint and predicate forms", () => {
    const { program, errors } = parseText(
      "pattern p\nbars a, b\nshould body_ratio b >= 0.65\nshould body(b) >= 0.65 * range(b)\n",
    );
    expect(errors).toEqual([]);
    expect(program!.statements).toHaveLength(2);
    const [hintStmt, predStmt] = program!.statements;
    expect(hintStmt?.kind).toBe("should");
    if (hintStmt?.kind === "should") {
      expect(hintStmt.preference.kind).toBe("hint");
    }
    if (predStmt?.kind === "should") {
      expect(predStmt.preference.kind).toBe("predicate");
    }
  });

  it("parses derive, draw, label", () => {
    const { program, errors } = parseText(
      `pattern p
bars a, b, c
derive gap.low = a.high
derive gap.high = c.low
draw gap as box amber
label b as displacement
`,
    );
    expect(errors).toEqual([]);
    expect(program!.statements.map((s) => s.kind)).toEqual(["derive", "derive", "draw", "label"]);
  });

  it("parses when ... then with ident value", () => {
    const { program } = parseText(
      "pattern p\nbars a, b, c\nwhen c.low <= 100 then state.value = mitigated\n",
    );
    const stmt = program!.statements[0]!;
    expect(stmt.kind).toBe("when");
    if (stmt.kind === "when") {
      expect(stmt.assignment.target).toMatchObject({ object: "state", property: "value" });
      expect(stmt.assignment.value.kind).toBe("ident");
    }
  });

  it("respects operator precedence", () => {
    const { program } = parseText("pattern p\nbars a\nderive x.y = 1 + 2 * 3\n");
    const stmt = program!.statements[0]!;
    if (stmt.kind === "derive" && stmt.expr.kind === "binary") {
      expect(stmt.expr.op).toBe("+");
      expect(stmt.expr.rhs.kind).toBe("binary");
      if (stmt.expr.rhs.kind === "binary") expect(stmt.expr.rhs.op).toBe("*");
    } else {
      throw new Error("unexpected AST");
    }
  });

  it("collects errors and continues", () => {
    const { errors } = parseText("pattern p\nbars a\nmust\n");
    expect(errors.length).toBeGreaterThan(0);
  });
});

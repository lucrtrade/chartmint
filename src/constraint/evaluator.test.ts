import { describe, expect, it } from "vitest";
import type { Candle } from "../render/plan";
import { evaluateExpr, evaluatePredicate } from "./evaluator";

const C = (over: Partial<Candle> = {}): Candle => ({
  time: 1,
  open: 100,
  high: 110,
  low: 95,
  close: 105,
  ...over,
});

const loc = { line: 1, col: 1, length: 1 };

function ctx(over?: Record<string, Candle>) {
  const a = over?.a ?? C();
  return {
    bars: [a],
    refs: { a: 0 },
    derived: { zones: {}, levels: {} },
  };
}

describe("evaluateExpr", () => {
  it("evaluates a number", () => {
    expect(evaluateExpr({ kind: "number", value: 7, loc }, ctx())).toBe(7);
  });

  it("evaluates bar.field", () => {
    const r = evaluateExpr({ kind: "barField", bar: "a", field: "high", loc }, ctx());
    expect(r).toBe(110);
  });

  it("evaluates body/range/mid", () => {
    expect(evaluateExpr({ kind: "call", func: "body", bar: "a", loc }, ctx())).toBe(5);
    expect(evaluateExpr({ kind: "call", func: "range", bar: "a", loc }, ctx())).toBe(15);
    expect(evaluateExpr({ kind: "call", func: "mid", bar: "a", loc }, ctx())).toBe(102.5);
  });

  it("evaluates binary precedence (already in tree)", () => {
    const expr = {
      kind: "binary" as const,
      op: "+" as const,
      lhs: { kind: "number" as const, value: 1, loc },
      rhs: {
        kind: "binary" as const,
        op: "*" as const,
        lhs: { kind: "number" as const, value: 2, loc },
        rhs: { kind: "number" as const, value: 3, loc },
      },
      loc,
    };
    expect(evaluateExpr(expr, ctx())).toBe(7);
  });

  it("resolves bar.field via derived zones when bar name is a zone", () => {
    const c = {
      bars: [C()],
      refs: { a: 0 },
      derived: { zones: { gap: { low: 100, high: 110 } }, levels: {} },
    };
    expect(evaluateExpr({ kind: "barField", bar: "gap", field: "low", loc }, c)).toBe(100);
    expect(evaluateExpr({ kind: "barField", bar: "gap", field: "high", loc }, c)).toBe(110);
  });
});

describe("evaluatePredicate", () => {
  it("compares", () => {
    const r = evaluatePredicate(
      {
        kind: "compare",
        op: "<",
        lhs: { kind: "number", value: 1, loc },
        rhs: { kind: "number", value: 2, loc },
        loc,
      },
      ctx(),
    );
    expect(r.passed).toBe(true);
  });

  it("evaluates direction(bullish)", () => {
    const r = evaluatePredicate(
      { kind: "direction", bar: "a", direction: "bullish", loc },
      ctx({ a: C({ open: 100, close: 105 }) }),
    );
    expect(r.passed).toBe(true);
  });
});

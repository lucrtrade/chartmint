import { describe, expect, it } from "vitest";
import { attemptRepair } from "./repair";
import { evaluatePredicate } from "../constraint/evaluator";
import type { Candle } from "../render/plan";

const loc = { line: 1, col: 1, length: 1 };
const C = (o: Partial<Candle>): Candle => ({
  time: 0,
  open: 100,
  high: 110,
  low: 95,
  close: 105,
  ...o,
});

describe("attemptRepair", () => {
  it("nudges to satisfy a.high < c.low when violated", () => {
    const bars = [
      C({ time: 1, high: 120, low: 100, open: 105, close: 115 }),
      C({ time: 2, high: 130, low: 125, open: 126, close: 128 }),
      C({ time: 3, high: 110, low: 100, open: 102, close: 108 }),
    ];
    const ctx = { bars, refs: { a: 0, b: 1, c: 2 }, derived: { zones: {}, levels: {} } };
    const predicate = {
      kind: "compare" as const,
      op: "<" as const,
      lhs: { kind: "barField" as const, bar: "a", field: "high" as const, loc },
      rhs: { kind: "barField" as const, bar: "c", field: "low" as const, loc },
      loc,
    };
    expect(evaluatePredicate(predicate, ctx).passed).toBe(false);
    attemptRepair(predicate, ctx);
    expect(evaluatePredicate(predicate, ctx).passed).toBe(true);
  });
});

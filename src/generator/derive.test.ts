import { describe, expect, it } from "vitest";
import { compile } from "../compile";
import { applyDerives } from "./derive";

describe("applyDerives", () => {
  it("computes zones and levels", () => {
    const r = compile(`pattern p
bars a, c
derive gap.low = a.high
derive gap.high = c.low
derive bos.level = a.high + 1
`);
    const m = r.semantic!;
    const bars = [
      { time: 1, open: 100, high: 105, low: 95, close: 103 },
      { time: 2, open: 103, high: 110, low: 102, close: 108 },
    ];
    const derived = applyDerives(m, {
      bars,
      refs: { a: 0, c: 1 },
      derived: { zones: {}, levels: {} },
    });
    expect(derived.zones.gap).toEqual({ low: 105, high: 102 });
    expect(derived.levels.bos).toBe(106);
  });
});

import { describe, expect, it } from "vitest";
import { compile } from "../compile";
import { applyDerives } from "./derive";
import { applyTransitions } from "./transitions";

describe("applyTransitions", () => {
  it("sets state.value when predicate holds", () => {
    const r = compile(`pattern p
bars a, b, c
derive gap.low = a.high
derive gap.high = c.low
when c.low <= gap.high then state.value = mitigated
`);
    const bars = [
      { time: 1, open: 100, high: 105, low: 95, close: 103 },
      { time: 2, open: 103, high: 108, low: 102, close: 107 },
      { time: 3, open: 107, high: 110, low: 106, close: 109 },
    ];
    const ctx = { bars, refs: { a: 0, b: 1, c: 2 }, derived: { zones: {}, levels: {} } };
    const derived = applyDerives(r.semantic!, ctx);
    const state = applyTransitions(r.semantic!, { ...ctx, derived });
    expect(state.value).toBe("mitigated");
  });

  it("leaves state empty when predicate fails", () => {
    const r = compile(`pattern p
bars a, b, c
derive gap.low = a.high
derive gap.high = c.low
when c.low > gap.high then state.value = mitigated
`);
    const bars = [
      { time: 1, open: 100, high: 105, low: 95, close: 103 },
      { time: 2, open: 103, high: 108, low: 102, close: 107 },
      { time: 3, open: 107, high: 110, low: 106, close: 109 },
    ];
    const ctx = { bars, refs: { a: 0, b: 1, c: 2 }, derived: { zones: {}, levels: {} } };
    const derived = applyDerives(r.semantic!, ctx);
    const state = applyTransitions(r.semantic!, { ...ctx, derived });
    expect(state.value).toBeUndefined();
  });
});

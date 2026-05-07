import { describe, expect, it } from "vitest";
import { compile } from "../compile";
import { generate } from "./generate";

describe("generate", () => {
  it("returns deterministic result for fixed seed", () => {
    const compiled = compile(`pattern p
bars a, b, c
seed 42
must a.high < c.low
derive gap.low = a.high
derive gap.high = c.low
draw gap as box amber
`);
    const r1 = generate(compiled, {});
    const r2 = generate(compiled, {});
    expect(r1.bars).toEqual(r2.bars);
    expect(r1.derived).toEqual(r2.derived);
    expect(r1.verification).toEqual(r2.verification);
  });

  it("resolves seed:random and exposes resolved seed", () => {
    const compiled = compile(`pattern p
bars a
seed random
`);
    const r = generate(compiled, { seed: 7 });
    expect(r.seed).toBe(7);
  });

  it("verifies must constraints", () => {
    const compiled = compile(`pattern p
bars a, b, c
seed 42
must a.high < c.low
derive gap.low = a.high
derive gap.high = c.low
`);
    const r = generate(compiled, {});
    expect(r.verification.must[0]?.passed).toBe(true);
  });
});

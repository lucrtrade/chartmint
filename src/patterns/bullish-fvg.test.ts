import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { compile } from "../compile";
import { generate } from "../generator/generate";
import { tokenize } from "../dsl/lexer";
import { parse } from "../dsl/parser";
import { GenerationError } from "../errors";
import { bullishFvg } from "./bullish-fvg";

describe("bullish_fvg", () => {
  it("snapshot for seed=42", () => {
    const r = generate(bullishFvg, { seed: 42, endTime: 1_700_000_000 });
    expect({
      seed: r.seed,
      lastThree: r.bars.slice(-3),
      derived: r.derived,
      verification: r.verification.must.map((m) => m.passed),
    }).toMatchSnapshot();
  });

  it("must passes for ≥95% of 100 random seeds", () => {
    let failures = 0;
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (seed) => {
        try {
          const r = generate(bullishFvg, { seed });
          for (const m of r.verification.must) {
            if (!m.passed) {
              failures++;
              return;
            }
          }
        } catch (e) {
          if (e instanceof GenerationError) {
            failures++;
            return;
          }
          throw e;
        }
      }),
      { numRuns: 100 },
    );
    expect(failures).toBeLessThanOrEqual(5);
  });

  it("DSL roundtrips", () => {
    const a = parse(tokenize(bullishFvg.source), bullishFvg.source).program!;
    const b = parse(tokenize(bullishFvg.source), bullishFvg.source).program!;
    expect(a).toEqual(b);
    expect(compile(bullishFvg.source).errors).toEqual([]);
  });
});

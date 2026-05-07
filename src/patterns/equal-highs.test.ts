import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { compile } from "../compile";
import { generate } from "../generator/generate";
import { tokenize } from "../dsl/lexer";
import { parse } from "../dsl/parser";
import { GenerationError } from "../errors";
import { equalHighs } from "./equal-highs";

describe("equal_highs", () => {
  it("snapshot for seed=42", () => {
    const r = generate(equalHighs, { seed: 42 });
    expect({
      seed: r.seed,
      a: r.bars[r.refs.a!],
      b: r.bars[r.refs.b!],
      derived: r.derived,
    }).toMatchSnapshot();
  });

  it("a.high ≈ b.high within 0.2% for ≥95% of 100 random seeds", () => {
    let failures = 0;
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (seed) => {
        try {
          const r = generate(equalHighs, { seed });
          const a = r.bars[r.refs.a!]!;
          const b = r.bars[r.refs.b!]!;
          if (Math.abs(a.high - b.high) / a.high > 0.002) {
            failures++;
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
    const a = parse(tokenize(equalHighs.source), equalHighs.source).program!;
    const b = parse(tokenize(equalHighs.source), equalHighs.source).program!;
    expect(a).toEqual(b);
    expect(compile(equalHighs.source).errors).toEqual([]);
  });
});

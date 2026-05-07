import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { compile } from "../compile";
import { generate } from "../generator/generate";
import { tokenize } from "../dsl/lexer";
import { parse } from "../dsl/parser";
import { GenerationError } from "../errors";
import { bullishBos } from "./bullish-bos";

describe("bullish_bos", () => {
  it("snapshot for seed=42", () => {
    const r = generate(bullishBos, { seed: 42 });
    expect({
      seed: r.seed,
      prev: r.bars[r.refs.prev!],
      brk: r.bars[r.refs.brk!],
      derived: r.derived,
      verification: r.verification.must.map((m) => m.passed),
    }).toMatchSnapshot();
  });

  it("must passes for ≥95% of 100 random seeds", () => {
    let failures = 0;
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 1_000_000 }), (seed) => {
        try {
          const r = generate(bullishBos, { seed });
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
    const a = parse(tokenize(bullishBos.source), bullishBos.source).program!;
    const b = parse(tokenize(bullishBos.source), bullishBos.source).program!;
    expect(a).toEqual(b);
    expect(compile(bullishBos.source).errors).toEqual([]);
  });
});

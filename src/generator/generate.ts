import type { CompileResult } from "../compile";
import { compile } from "../compile";
import { GenerationError } from "../errors";
import type { Predicate } from "../dsl/ast";
import type { SemanticModel } from "../semantic/model";
import type { Candle } from "../render/plan";
import { evaluatePredicate, type DerivedView, type EvalContext } from "../constraint/evaluator";
import { generateBaseSeries } from "./base-series";
import { applyHooks, type HookContext } from "./hooks";
import { applyDerives } from "./derive";
import { attemptRepair } from "./repair";
import { applyTransitions } from "./transitions";

export type RefMap = Record<string, number>;

export type PatternTemplate = {
  name: string;
  source: string;
  mapping: (bars: Candle[]) => RefMap;
};

export type GenerateOptions = {
  seed?: number;
  tolerance?: { equalPrice?: number };
};

export type GenerateResult = {
  seed: number;
  bars: Candle[];
  refs: RefMap;
  derived: DerivedView;
  state: Record<string, number | string>;
  verification: {
    must: { predicate: Predicate; passed: boolean; lhs?: number; rhs?: number }[];
    should: { predicate: Predicate; passed: boolean; lhs?: number; rhs?: number }[];
  };
};

export function generate(
  spec: CompileResult | string | PatternTemplate,
  opts: GenerateOptions = {},
): GenerateResult {
  const { compiled, mapping } = resolveSpec(spec);
  if (!compiled.semantic) {
    throw new Error(
      `cannot generate: compile produced ${compiled.errors.length} error(s); ` +
        `first: ${compiled.errors[0]?.message ?? "(none)"}`,
    );
  }
  const model = compiled.semantic;
  const seed = resolveSeed(model, opts);

  const bars = generateBaseSeries(seed, model.series);
  const refs = mapping ? mapping(bars) : defaultMapping(model.bars, bars.length);

  const tolerance = opts.tolerance?.equalPrice ?? 0.001;
  const hookCtx: HookContext = { bars, refs, tolerance };
  applyHooks(model.shouldHints, hookCtx);

  let derived = applyDerives(model, {
    bars,
    refs,
    derived: { zones: {}, levels: {} },
    seed,
  });
  let mustResults = checkMust(model, { bars, refs, derived, seed });

  if (mustResults.some((r) => !r.passed)) {
    for (const m of mustResults) {
      if (m.passed) continue;
      attemptRepair(m.predicate, { bars, refs, derived, seed });
    }
    derived = applyDerives(model, {
      bars,
      refs,
      derived: { zones: {}, levels: {} },
      seed,
    });
    mustResults = checkMust(model, { bars, refs, derived, seed });
    if (mustResults.some((r) => !r.passed)) {
      const failed = mustResults.find((r) => !r.passed)!;
      throw new GenerationError(
        "must_failed",
        `must predicate failed after repair: lhs=${failed.lhs}, rhs=${failed.rhs}`,
        seed,
        failed.predicate,
        { repaired: true },
      );
    }
  }

  const ctx: EvalContext = { bars, refs, derived, seed };
  const shouldResults = model.shouldPredicates.map((p) => ({
    predicate: p,
    ...evaluatePredicate(p, ctx),
  }));
  const state = applyTransitions(model, ctx);

  return {
    seed,
    bars,
    refs,
    derived,
    state,
    verification: { must: mustResults, should: shouldResults },
  };
}

function checkMust(model: SemanticModel, ctx: EvalContext) {
  return model.must.map((p) => ({
    predicate: p,
    ...evaluatePredicate(p, ctx),
  }));
}

function resolveSpec(spec: CompileResult | string | PatternTemplate): {
  compiled: CompileResult;
  mapping?: PatternTemplate["mapping"];
} {
  if (typeof spec === "string") {
    return { compiled: compile(spec) };
  }
  if ("source" in spec && "mapping" in spec) {
    return { compiled: compile(spec.source), mapping: spec.mapping };
  }
  return { compiled: spec };
}

function resolveSeed(model: SemanticModel, opts: GenerateOptions): number {
  if (opts.seed !== undefined) return opts.seed;
  if (model.seed === "random") {
    return Math.floor(Math.random() * 0x7fffffff);
  }
  return model.seed;
}

function defaultMapping(barNames: string[], total: number): RefMap {
  const refs: RefMap = {};
  const offset = total - barNames.length;
  barNames.forEach((name, i) => {
    refs[name] = offset + i;
  });
  return refs;
}

import { evaluateExpr, type EvalContext, type DerivedView } from "../constraint/evaluator";
import type { SemanticModel } from "../semantic/model";

export function applyDerives(model: SemanticModel, ctx: EvalContext): DerivedView {
  const derived: DerivedView = { zones: {}, levels: {} };
  const evalCtx: EvalContext = { ...ctx, derived };
  for (const [name, spec] of model.zones) {
    const low = evaluateExpr(spec.lowExpr, evalCtx);
    const high = evaluateExpr(spec.highExpr, evalCtx);
    derived.zones[name] = { low, high };
  }
  for (const [name, spec] of model.levels) {
    derived.levels[name] = evaluateExpr(spec.valueExpr, evalCtx);
  }
  return derived;
}

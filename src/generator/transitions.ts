import type { SemanticModel } from "../semantic/model";
import { evaluateExpr, evaluatePredicate, type EvalContext } from "../constraint/evaluator";

export function applyTransitions(
  model: SemanticModel,
  ctx: EvalContext,
): Record<string, number | string> {
  const state: Record<string, number | string> = {};
  for (const wt of model.whenThen) {
    const result = evaluatePredicate(wt.predicate, ctx);
    if (!result.passed) continue;
    const value =
      wt.assignment.value.kind === "ident"
        ? wt.assignment.value.name
        : evaluateExpr(wt.assignment.value, ctx);
    if (wt.assignment.target.object === "state") {
      state[wt.assignment.target.property] = value;
    }
  }
  return state;
}

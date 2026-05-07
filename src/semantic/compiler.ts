import { CompileError } from "../errors";
import type { Expr, Program } from "../dsl/ast";
import type {
  DrawSpec,
  LabelSpec,
  LevelSpec,
  RangeSpec,
  SemanticModel,
  StateSpec,
  WhenThenSpec,
  ZoneSpec,
} from "./model";

export type SemanticResult = { model?: SemanticModel; errors: CompileError[] };

export function compileSemantic(program: Program): SemanticResult {
  const errors: CompileError[] = [];

  const groups = new Map<string, Map<string, Expr>>(); // object → property → expr
  for (const stmt of program.statements) {
    if (stmt.kind !== "derive") continue;
    let g = groups.get(stmt.target.object);
    if (!g) {
      g = new Map();
      groups.set(stmt.target.object, g);
    }
    g.set(stmt.target.property, stmt.expr);
  }

  const zones = new Map<string, ZoneSpec>();
  const levels = new Map<string, LevelSpec>();
  const ranges = new Map<string, RangeSpec>();
  const states = new Map<string, StateSpec>();

  for (const [name, props] of groups) {
    const keys = new Set(props.keys());
    if (keys.has("low") && keys.has("high") && keys.size === 2) {
      zones.set(name, { lowExpr: props.get("low")!, highExpr: props.get("high")! });
      continue;
    }
    if (keys.has("low") && keys.has("mid") && keys.has("high") && keys.size === 3) {
      ranges.set(name, {
        lowExpr: props.get("low")!,
        midExpr: props.get("mid")!,
        highExpr: props.get("high")!,
      });
      continue;
    }
    if (keys.has("level") && keys.size === 1) {
      levels.set(name, { valueExpr: props.get("level")! });
      continue;
    }
    if (keys.has("value") && keys.size === 1) {
      states.set(name, { initial: undefined });
      continue;
    }
    if (keys.has("low") && !keys.has("high")) {
      errors.push(new CompileError("semantic", `zone '${name}' missing 'high' derive`));
      continue;
    }
    if (keys.has("high") && !keys.has("low")) {
      errors.push(new CompileError("semantic", `zone '${name}' missing 'low' derive`));
      continue;
    }
    errors.push(
      new CompileError(
        "semantic",
        `unknown derive shape '${name}' (got [${[...keys].join(", ")}]; ` +
          `expected {low,high} | {low,mid,high} | {level} | {value})`,
      ),
    );
  }

  const draws: DrawSpec[] = [];
  const labels: LabelSpec[] = [];
  const whenThen: WhenThenSpec[] = [];
  const must: SemanticModel["must"] = [];
  const shouldHints: SemanticModel["shouldHints"] = [];
  const shouldPredicates: SemanticModel["shouldPredicates"] = [];

  for (const stmt of program.statements) {
    switch (stmt.kind) {
      case "must":
        must.push(stmt.predicate);
        break;
      case "should":
        if (stmt.preference.kind === "hint") shouldHints.push(stmt.preference.hint);
        else shouldPredicates.push(stmt.preference.predicate);
        break;
      case "draw": {
        const targetKind = zones.has(stmt.target)
          ? "zone"
          : levels.has(stmt.target)
            ? "level"
            : null;
        if (!targetKind) {
          errors.push(
            new CompileError(
              "semantic",
              `draw target '${stmt.target}' has no semantic type (zone or level)`,
              stmt.loc,
            ),
          );
          break;
        }
        draws.push({
          target: stmt.target,
          targetKind,
          drawKind: stmt.drawKind,
          color: stmt.color,
        });
        break;
      }
      case "label":
        labels.push({ barRef: stmt.ref, text: stmt.text });
        break;
      case "when":
        whenThen.push({ predicate: stmt.predicate, assignment: stmt.assignment });
        if (stmt.assignment.target.object === "state" && !states.has("state")) {
          states.set("state", { initial: undefined });
        }
        break;
      case "derive":
        break;
    }
  }

  if (errors.length > 0) return { errors };

  const model: SemanticModel = {
    pattern: program.pattern,
    bars: program.bars,
    series: program.series,
    seed: program.seed,
    zones,
    levels,
    ranges,
    states,
    draws,
    labels,
    must,
    shouldHints,
    shouldPredicates,
    whenThen,
  };
  return { model, errors };
}

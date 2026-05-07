import { CompileError } from "../errors";
import type { Expr, Predicate, Program, Statement, Target } from "./ast";

export function validate(program: Program): CompileError[] {
  const errors: CompileError[] = [];
  const bars = new Set(program.bars);
  const derived = new Map<string, Set<string>>(); // object → set of properties
  const stateSlots = new Set<string>();

  // First pass: collect derives, check duplicates and bar refs in expressions.
  for (const stmt of program.statements) {
    if (stmt.kind !== "derive") continue;
    const props = derived.get(stmt.target.object) ?? new Set<string>();
    if (props.has(stmt.target.property)) {
      errors.push(
        new CompileError(
          "validate",
          `duplicate derive target '${stmt.target.object}.${stmt.target.property}'`,
          stmt.target.loc,
        ),
      );
      continue;
    }
    props.add(stmt.target.property);
    derived.set(stmt.target.object, props);
    checkExprBarRefs(stmt.expr, bars, errors);
  }

  // Build a set of valid identifiers: bars + derived object names + "state".
  const validRefs = new Set([...bars, ...derived.keys(), "state"]);

  // Cycle detection on derives.
  detectCycles(program.statements, errors);

  // Second pass: must/should/draw/label/when checks.
  for (const stmt of program.statements) {
    switch (stmt.kind) {
      case "must":
        checkPredicateBarRefs(stmt.predicate, validRefs, errors);
        break;
      case "should":
        if (stmt.preference.kind === "predicate") {
          checkPredicateBarRefs(stmt.preference.predicate, validRefs, errors);
        } else {
          checkHintBarRefs(stmt.preference.hint, bars, errors);
        }
        break;
      case "draw": {
        if (!derived.has(stmt.target)) {
          errors.push(
            new CompileError(
              "validate",
              `no derive produces '${stmt.target}'; cannot draw it`,
              stmt.loc,
            ),
          );
        }
        break;
      }
      case "label": {
        if (!bars.has(stmt.ref)) {
          errors.push(new CompileError("validate", `unknown bar '${stmt.ref}'`, stmt.loc));
        }
        break;
      }
      case "when": {
        checkPredicateBarRefs(stmt.predicate, validRefs, errors);
        const tgt = stmt.assignment.target;
        // state.* slots are declared lazily (validator records them).
        if (tgt.object === "state") {
          stateSlots.add(tgt.property);
        } else {
          // Otherwise the target must already be a derive target.
          const props = derived.get(tgt.object);
          if (!props?.has(tgt.property)) {
            errors.push(
              new CompileError(
                "validate",
                `assignment target '${tgt.object}.${tgt.property}' is not derived`,
                tgt.loc,
              ),
            );
          }
        }
        if (stmt.assignment.value.kind !== "ident") {
          checkExprBarRefs(stmt.assignment.value, validRefs, errors);
        }
        break;
      }
      case "derive":
        // already handled
        break;
    }
  }

  return errors;
}

function checkExprBarRefs(expr: Expr, bars: Set<string>, errors: CompileError[]): void {
  switch (expr.kind) {
    case "number":
      return;
    case "barField":
      if (!bars.has(expr.bar)) {
        errors.push(new CompileError("validate", `unknown bar '${expr.bar}'`, expr.loc));
      }
      return;
    case "call":
      if (!bars.has(expr.bar)) {
        errors.push(new CompileError("validate", `unknown bar '${expr.bar}'`, expr.loc));
      }
      return;
    case "binary":
      checkExprBarRefs(expr.lhs, bars, errors);
      checkExprBarRefs(expr.rhs, bars, errors);
      return;
  }
}

function checkPredicateBarRefs(p: Predicate, bars: Set<string>, errors: CompileError[]): void {
  if (p.kind === "compare") {
    checkExprBarRefs(p.lhs, bars, errors);
    checkExprBarRefs(p.rhs, bars, errors);
  } else {
    if (!bars.has(p.bar)) {
      errors.push(new CompileError("validate", `unknown bar '${p.bar}'`, p.loc));
    }
  }
}

import type { ShapeHint } from "./ast";

function checkHintBarRefs(hint: ShapeHint, bars: Set<string>, errors: CompileError[]): void {
  const refs: string[] =
    hint.kind === "equal_highs" || hint.kind === "equal_lows"
      ? [hint.left, hint.right]
      : [hint.bar];
  for (const r of refs) {
    if (!bars.has(r)) {
      errors.push(new CompileError("validate", `unknown bar '${r}'`, hint.loc));
    }
  }
}

function detectCycles(statements: Statement[], errors: CompileError[]): void {
  // Build dependency graph: derive target → set of (object.property) it reads from.
  const deps = new Map<string, Set<string>>();
  const known = new Set<string>();
  for (const s of statements) {
    if (s.kind !== "derive") continue;
    const key = `${s.target.object}.${s.target.property}`;
    known.add(key);
    deps.set(key, collectDerivedRefs(s.expr));
  }

  // Standard DFS for cycles, ignoring deps that aren't derive targets.
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const k of deps.keys()) color.set(k, WHITE);

  const visit = (node: string): boolean => {
    color.set(node, GRAY);
    for (const next of deps.get(node) ?? []) {
      if (!known.has(next)) continue;
      const c = color.get(next) ?? WHITE;
      if (c === GRAY) return true;
      if (c === WHITE && visit(next)) return true;
    }
    color.set(node, BLACK);
    return false;
  };

  for (const node of deps.keys()) {
    if (color.get(node) === WHITE && visit(node)) {
      errors.push(new CompileError("validate", `cycle in derive graph involving '${node}'`));
      return;
    }
  }
}

function collectDerivedRefs(expr: Expr): Set<string> {
  const out = new Set<string>();
  const walk = (e: Expr): void => {
    if (e.kind === "binary") {
      walk(e.lhs);
      walk(e.rhs);
    } else if (e.kind === "barField") {
      out.add(`${e.bar}.${e.field}`);
    }
    // numbers and calls don't reference derive targets
  };
  walk(expr);
  return out;
}

// keep Target type used for clarity in future callers
export type _Target = Target;

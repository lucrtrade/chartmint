# ChartMint v0.1.0 — Implementation Design

- **Status:** Approved (pending user spec review)
- **Date:** 2026-05-07
- **Source spec:** ChartMint Specification v0.1 (`2026-05-07`)
- **Targets:** `@lucrtrade/chartmint@0.1.0`

## 1. Goal and scope

Land the first usable cut of the library described in the source spec. v0.1.0 must deliver — end-to-end and from a single npm package — DSL parsing, semantic compilation, rule-guided synthetic OHLC generation, hard-constraint verification, and a Lightweight Charts adapter for three representative patterns. The library must be importable headlessly (server, tests) and applicable to a `lightweight-charts` chart instance with a one-line call.

Out of scope (deferred): browser playground, additional patterns, soft-constraint scoring, solver-backed generation, DSL extensions for tolerance/windows/swings. See §7.

## 2. Decisions captured during brainstorming

| #   | Question                   | Decision                                                                                                                                                                                      |
| --- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | v0 deliverable shape       | **A** — Headless library only, single npm package. Keep current publish pipeline.                                                                                                             |
| 2   | Phase cut from source spec | **B** — Phase 1 + Phase 2 + light Phase 3 (rule-guided generation via named hooks; one local repair pass; no scoring, no solver).                                                             |
| 3   | Pattern catalog in v0.1.0  | **B** — Three patterns: `bullish_fvg` (zone), `bullish_bos` (level), `equal_highs` (tolerance + multi-bar).                                                                                   |
| 4   | Renderer shape             | **C** — Both data plan and `applyToChart` adapter. `lightweight-charts` moves from `dependencies` to `peerDependencies` (`>=5.0.0`).                                                          |
| 5   | Design defaults            | **A** — Strict-simple: minimal expression grammar; named hooks (no scoring); tolerance via runtime options, not grammar; AST raw, semantic compiler infers zones/levels by naming convention. |

## 3. Architecture

### 3.1 Module layout

Single package, ESM-only. All source under `src/`. One directory per concern; one file per type.

```
src/
  index.ts             # public re-exports only
  errors.ts            # CompileError, GenerationError, RenderError
  dsl/
    lexer.ts           # source → Token[]
    parser.ts          # Token[] → AST
    ast.ts             # AST node type definitions
    validator.ts       # post-parse semantic checks
  semantic/
    model.ts           # Zone, Level, Range, State, SemanticModel
    compiler.ts        # AST → SemanticModel
  generator/
    base-series.ts     # seeded mulberry32 random walk
    hooks.ts           # named ShapeHint reshape functions
    derive.ts          # evaluate `derive` statements
    transitions.ts     # evaluate `when ... then`
    repair.ts          # single-pass local repair on must-failure
    generate.ts        # orchestration entrypoint
  constraint/
    evaluator.ts       # evaluate predicates and expressions
  render/
    plan.ts            # RenderPlan type definitions
    plan-builder.ts    # GenerateResult → RenderPlan
    apply.ts           # applyToChart(IChartApi, RenderPlan)  ← only file importing lightweight-charts
  patterns/
    bullish-fvg.ts     # template source + bar mapping
    bullish-bos.ts
    equal-highs.ts
    index.ts           # registry export
```

`src/render/apply.ts` is the only module that imports `lightweight-charts`. Every other module remains headless and importable without DOM/canvas.

### 3.2 Public API

Named exports only. No default export.

```ts
import {
  compile, // (source: string) => CompileResult
  generate, // (specOrSource: CompileResult | string | PatternTemplate, opts?: GenerateOptions) => GenerateResult
  buildPlan, // (result: GenerateResult) => RenderPlan
  applyToChart, // (chart: IChartApi, plan: RenderPlan) => RenderHandles
  patterns, // { bullish_fvg, bullish_bos, equal_highs }
} from "@lucrtrade/chartmint";

import type {
  CompileResult,
  GenerateResult,
  GenerateOptions,
  RenderPlan,
  RenderHandles,
  AST,
  SemanticModel,
  PatternTemplate,
  CompileError,
  GenerationError,
  RenderError,
} from "@lucrtrade/chartmint";
```

A `PatternTemplate = { name: string; source: string; mapping: (bars: Candle[]) => RefMap }`. User-defined patterns are first-class — `generate(myCustomTemplate, opts)` is the same code path as `generate(patterns.bullish_fvg, opts)`.

### 3.3 Dependency change

| Field                                              | Before   | After                                      |
| -------------------------------------------------- | -------- | ------------------------------------------ |
| `dependencies.lightweight-charts`                  | `5.2.0`  | (removed)                                  |
| `peerDependencies.lightweight-charts`              | (absent) | `>=5.0.0`                                  |
| `peerDependenciesMeta.lightweight-charts.optional` | (absent) | `true`                                     |
| `devDependencies.lightweight-charts`               | (absent) | `5.2.0` (for the adapter integration test) |
| `devDependencies.fast-check`                       | (absent) | added                                      |
| `devDependencies.jsdom`                            | (absent) | added                                      |

## 4. DSL: grammar slice, AST, semantic model

### 4.1 v0 grammar (subset of source spec §"Formal Grammar")

Identical to the source spec example surface, with three deliberate trims:

- `draw <ident> as band` — deferred (no `premium_discount` in v0).
- `<expr> in <zone>` and `<expr> touches <zone>` predicates — deferred (no zone-typed expressions in v0).
- `should respect <zone>` shape hint — deferred (depends on `in` / `touches`).

Header: `pattern <ident>`, `bars <ident> { , <ident> }`, optional `series <int>` (default 30), optional `seed (<int> | random)`.

Statements: `must | should | derive | when | draw | label`.

`should` accepts two forms:

1. **Predicate form** — e.g. `should body(b) >= 0.65 * range(b)`. Verified against generated output and reported, but does **not** reshape generation.
2. **Named ShapeHint** — registry-only:
   - `force_bullish <id>` / `force_bearish <id>`
   - `body_ratio <id> >= <number>`
   - `impulsive <id>`
   - `equal_highs <id> <id>` / `equal_lows <id> <id>`

   Each maps to one deterministic reshape function in `generator/hooks.ts`.

Expressions strictly per source spec: `bar.field | number | func(ident) | (expr) | expr (+|-|*|/) term`. No nested function calls, no variables. `func ∈ { body, range, mid }`. `field ∈ { open, high, low, close }`. Anything else → `CompileError(kind: "parse")`.

**Colors.** `draw <ident> as <drawkind> [<color>]` where `<color>` is a single identifier from a fixed palette: `amber | blue | green | red | gray | white`. Mapped to hex internally by the plan builder. Anything else → `CompileError(kind: "validate")`. Hex literals deferred to v0.2.

### 4.2 AST

Discriminated unions; every node carries `loc: { line: number; col: number; length: number }`.

```ts
type Program = {
  pattern: string;
  bars: string[];
  series: number; // default 30
  seed: number | "random";
  statements: Statement[];
  source: string; // original DSL text, for error code-frames
};

type Statement =
  | { kind: "must"; predicate: Predicate; loc: SourceLoc }
  | { kind: "should"; preference: Preference; loc: SourceLoc }
  | { kind: "derive"; target: Target; expr: Expr; loc: SourceLoc }
  | { kind: "when"; predicate: Predicate; assignment: Assignment; loc: SourceLoc }
  | { kind: "draw"; target: string; drawKind: "box" | "line"; color?: string; loc: SourceLoc }
  | { kind: "label"; ref: string; text: string; loc: SourceLoc };

type Predicate =
  | { kind: "compare"; lhs: Expr; op: "<" | ">" | "<=" | ">=" | "="; rhs: Expr }
  | { kind: "direction"; bar: string; direction: "bullish" | "bearish" };

type Preference = { kind: "predicate"; predicate: Predicate } | { kind: "hint"; hint: ShapeHint };

type ShapeHint =
  | { kind: "force_bullish" | "force_bearish" | "impulsive"; bar: string }
  | { kind: "body_ratio"; bar: string; min: number }
  | { kind: "equal_highs" | "equal_lows"; left: string; right: string };

type Expr =
  | { kind: "number"; value: number }
  | { kind: "barField"; bar: string; field: "open" | "high" | "low" | "close" }
  | { kind: "call"; func: "body" | "range" | "mid"; bar: string }
  | { kind: "binary"; op: "+" | "-" | "*" | "/"; lhs: Expr; rhs: Expr };

type Target = { object: string; property: string };
type Assignment = { target: Target; value: Expr | { kind: "ident"; name: string } };
```

### 4.3 Validator

Post-parse, pre-semantic. Adds `CompileError(kind: "validate")` entries:

- All `bar.field` / hint args reference declared bars.
- No duplicate `derive` targets.
- Every `draw <name> ...` references a name produced by some `derive`.
- Every `label <ref> as ...` references a declared bar.
- Every `when ... then state.X = ident-or-expr` has `state.X` as a derived target (declared by some `derive state.X = ...`) or freshly introduced (in which case the validator records it as a state slot).
- No cycle in `derive` references (`gap.low = a.high; gap.high = gap.low + ...` is allowed; `x = y; y = x` is not).

### 4.4 Semantic compiler

`semantic/compiler.ts` walks `Statement[]` and groups `derive` by name prefix using a single naming-convention table:

| Derive prefix                                          | Inferred type                      |
| ------------------------------------------------------ | ---------------------------------- |
| `<n>.low` + `<n>.high` (both required)                 | `Zone n`                           |
| `<n>.level` (alone)                                    | `Level n`                          |
| `<n>.value` (alone, used as target of `when ... then`) | `State n`                          |
| `<n>.{low,mid,high}` (all three)                       | `Range n` (in table; unused in v0) |

Anything else (e.g. `gap.middle`) → `CompileError(kind: "semantic")` with the offending source loc. Adding new shapes is one row in this table.

Output:

```ts
type SemanticModel = {
  bars: string[];
  zones: Map<string, { lowExpr: Expr; highExpr: Expr; loc: SourceLoc }>;
  levels: Map<string, { valueExpr: Expr; loc: SourceLoc }>;
  states: Map<string, { initial?: Expr | string }>;
  draws: {
    target: string;
    targetKind: "zone" | "level";
    drawKind: "box" | "line";
    color?: string;
  }[];
  labels: { barRef: string; text: string }[];
  must: Predicate[];
  shouldHints: ShapeHint[];
  shouldPredicates: Predicate[];
  whenThen: { predicate: Predicate; assignment: Assignment }[];
};
```

## 5. Generator, constraints, render

### 5.1 Generation pipeline (`generator/generate.ts`)

```
compile(source) → GenerateOptions → bars
  1. base-series:       seeded mulberry32 emits N candles
  2. mapping:           pattern.mapping(bars) → RefMap
  3. hook pass:         walk shouldHints in source order, apply each
  4. derive pass:       evaluate `derive` statements left→right
  5. must check:
       a. evaluate every must predicate
       b. on failure: one repair pass (nudge offending bar)
       c. re-evaluate
       d. still failing → throw GenerationError
  6. should-predicate verification (report only; no reshape)
  7. transitions: evaluate every when ... then; update state map
```

Result:

```ts
type GenerateResult = {
  seed: number; // resolved seed (random → concrete)
  bars: Candle[];
  refs: RefMap; // RefMap = Record<string, number> (bar id → index)
  derived: {
    zones: Record<string, { low: number; high: number }>;
    levels: Record<string, number>;
  };
  state: Record<string, number | string>;
  verification: {
    must: { predicate: Predicate; passed: boolean; lhs?: number; rhs?: number }[];
    should: { predicate: Predicate; passed: boolean; lhs?: number; rhs?: number }[];
  };
};
```

### 5.2 Hook semantics (`generator/hooks.ts`)

| Hint                | Reshape behavior                                                                                                                                         |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | --------------------------------------------------------------- |
| `force_bullish b`   | If `b.close <= b.open`, swap. Preserve high/low.                                                                                                         |
| `force_bearish b`   | If `b.close >= b.open`, swap.                                                                                                                            |
| `body_ratio b >= R` | Ensure `                                                                                                                                                 | close − open | / (high − low) >= R`. Widen body or shrink wicks symmetrically. |
| `impulsive b`       | Apply `force_bullish` (or bearish per surrounding direction hints), then `body_ratio b >= 0.7`, then ensure `range(b) >= 1.5 × avg(range, last 5 bars)`. |
| `equal_highs a b`   | Set `b.high = a.high ± rand(±tolerance)`; tolerance defaults to `0.001 × midprice(a)`. Overridable via `GenerateOptions.tolerance.equalPrice`.           |
| `equal_lows a b`    | Symmetric.                                                                                                                                               |

Hooks apply in source order; later hooks may stomp earlier ones — this is intentional (closer to literal DSL meaning).

### 5.3 Constraint evaluator (`constraint/evaluator.ts`)

Pure functions. `evaluateExpr(expr, ctx) → number`, `evaluatePredicate(p, ctx) → { passed, lhs?, rhs? }`. Context is `{ bars, refs, derived }`. Helpers: `body(b) = |b.close − b.open|`, `range(b) = b.high − b.low`, `mid(b) = (b.high + b.low) / 2`. Division by zero → `GenerationError(kind: "hook_unsatisfiable")`.

### 5.4 Repair (`generator/repair.ts`)

For each failed `must` predicate of form `<expr> <op> <expr>`:

- Identify bar refs on each side.
- Compute the minimal delta that would satisfy the comparison with a small epsilon (`0.001 × midprice`).
- Choose which side to nudge by preferring the bar with fewer hooks already applied (tracked during the hook pass). Tie-break on lower bar index.
- Apply nudge; preserve `low <= open, close <= high` invariant.

After one repair pass, re-evaluate **all** `must` predicates. If any still fail, throw. No iterative repair.

### 5.5 Render plan (`render/plan.ts`, `render/plan-builder.ts`)

```ts
type Candle = { time: number; open: number; high: number; low: number; close: number };

type ZoneOverlay = {
  name: string;
  time1: number;
  price1: number;
  time2: number;
  price2: number;
  color?: string;
  opacity?: number;
};

type LevelOverlay = {
  name: string;
  price: number;
  color?: string;
  lineStyle?: "solid" | "dashed" | "dotted";
  lineWidth?: number;
};

type MarkerSpec = {
  time: number;
  position: "aboveBar" | "belowBar" | "inBar";
  shape: "circle" | "square" | "arrowUp" | "arrowDown";
  color?: string;
  text?: string;
};

type RenderPlan = {
  candles: Candle[];
  zones: ZoneOverlay[];
  levels: LevelOverlay[];
  markers: MarkerSpec[];
};
```

Builder rules:

- For each `(zone, draw box)` pair → `ZoneOverlay`. `time1` / `time2` = the time bounds of the bars referenced by the zone's defining derives. `price1` / `price2` = `zone.low` / `zone.high`. Color from `draw color` literal; otherwise default amber `#f59e0b66`.
- For each `(level, draw line)` pair → `LevelOverlay`. Default color white.
- For each `label <ref> as <text>` → `MarkerSpec` on the labeled bar's time. Default position `aboveBar`, shape `circle`, color blue.

### 5.6 `applyToChart` (`render/apply.ts`)

```ts
type RenderHandles = {
  candleSeries: ISeriesApi<"Candlestick">;
  lineSeries: ISeriesApi<"Line">[];
  zonePrimitives: ISeriesPrimitive<Time>[];
  markersHandle: ISeriesMarkersPluginApi<Time>;
};

function applyToChart(chart: IChartApi, plan: RenderPlan): RenderHandles;
```

- Add a candlestick series via the v5 API (`chart.addSeries(CandlestickSeries, opts)`) and call `setData(plan.candles)`.
- One line series per `LevelOverlay` (v5: `chart.addSeries(LineSeries, opts)`). Set 2-point series at `[firstCandleTime, lastCandleTime]` both at `price`.
- Each `ZoneOverlay` attaches a tiny custom `ISeriesPrimitive` (~50 lines) that draws a filled rectangle bounded by the zone's time and price corners. No DOM overlays.
- Markers via **`createSeriesMarkers(candleSeries, plan.markers)`** — addresses the v5 migration footgun called out in the source spec.
- Returns `RenderHandles` for consumer-side updates. No `dispose()` — chart lifecycle stays the consumer's responsibility.

### 5.7 Determinism guarantee

Same `seed` + same DSL = bit-identical `bars`, `derived`, `state`, and `verification`. Property tests (§6) and snapshot tests rely on this. `seed: random` resolves once at compile time and surfaces as `GenerateResult.seed` so any run is reproducible.

## 6. Errors and testing

### 6.1 Error model

```ts
class CompileError extends Error {
  kind: "lex" | "parse" | "validate" | "semantic";
  loc?: SourceLoc;
  format(source?: string): string; // code-frame string with caret
}

class GenerationError extends Error {
  kind: "must_failed" | "hook_unsatisfiable";
  seed: number;
  predicate?: Predicate;
  details?: Record<string, unknown>; // includes `repaired: boolean` for must_failed
}

class RenderError extends Error {
  kind: "missing_overlay_target" | "unsupported_drawkind";
}
```

- `compile` does **not** throw. Returns `{ ast?, semantic?, errors: CompileError[] }`. Lexer / parser / validator / semantic each accumulate into the same array; later phases skip if upstream produced errors. **Cycle detection in `derive` references is the validator's responsibility** — by the time the generator runs, derives are guaranteed acyclic.
- `generate` throws `GenerationError(kind: "must_failed")` on a `must` failure that survived the one-shot repair pass; `details.repaired = true` distinguishes post-repair failures from pre-repair ones (when the offending predicate references no nudgeable bar). `details.repaired = false` means repair was skipped entirely. `kind: "hook_unsatisfiable"` is reserved for arithmetic edge cases (e.g. `range = 0` when applying `body_ratio`). `seed` and `predicate` are always populated so callers can retry with a fresh seed.
- `applyToChart` throws `RenderError` on plan-level inconsistency.

### 6.2 Test layers

All under `src/**/*.test.ts` (already wired to vitest).

1. **Unit tests** — one spec file per module: lexer, parser, validator, semantic compiler, evaluator, each hook, derive, transitions, repair, plan-builder. Pure-function targets.
2. **Pattern integration tests** — one file per shipped pattern (`bullish_fvg`, `bullish_bos`, `equal_highs`). Each contains:
   - **Snapshot test** — fixed seed (`42`) → `toMatchInlineSnapshot` of `bars + derived + verification`.
   - **Property test (fast-check)** — 100 random seeds; assert every `must` predicate passes. Budget ≤ 5% of seeds may legitimately throw `GenerationError` (documented; if exceeded, fix the pattern or its hooks, not the test).
   - **DSL roundtrip** — parse template source → emit canonical form → re-parse → assert AST equality.
3. **Renderer adapter integration** — single file under `src/render/apply.test.ts`. jsdom + real `lightweight-charts`, run `applyToChart` against the FVG plan, assert `RenderHandles` populated and no thrown errors. No canvas pixel comparisons.

### 6.3 Coverage targets

- `dsl/`, `semantic/`, `generator/`, `constraint/`: ≥ 85% statements.
- `render/`: ≥ 70% (canvas paths intentionally uncovered).

Add a CI step to enforce these via `vitest run --coverage` once the suite stabilizes. Not blocking for the initial PR.

## 7. Explicit non-goals for v0.1.0

| Deferred to               | Item                                                           |
| ------------------------- | -------------------------------------------------------------- |
| v0.2                      | `band` drawkind + `premium_discount` pattern                   |
| v0.2                      | `in` / `touches` predicates + `respect` hint                   |
| v0.2                      | `liquidity_sweep_high`, `bullish_ob`, `bullish_choch` patterns |
| v0.2                      | Browser playground app                                         |
| v0.3                      | `should` scoring (vs deterministic hooks)                      |
| v0.3                      | `tolerance` as a DSL keyword (vs runtime option)               |
| Phase 4 (per source spec) | Windows / future references / swing abstractions               |
| Phase 4                   | DOM-overlay alternative to custom-series primitive             |
| Phase 4                   | Counterexample / near-miss generation                          |
| Phase 5                   | SAT/SMT solver-backed generation                               |

These decisions are reversible — the architecture in §3 admits each addition without redesign of upstream stages.

## 8. Acceptance criteria

v0.1.0 is shippable when:

- `bun run ci` (format check, lint, typecheck, test) passes locally and in CI.
- All three patterns (`bullish_fvg`, `bullish_bos`, `equal_highs`) round-trip parse → generate → verify → buildPlan → applyToChart in jsdom without thrown errors.
- For each pattern, 100 random-seed property tests pass within the ≤ 5% `GenerationError` budget.
- The published tarball contains only `dist/`, `LICENSE`, `README.md`, `package.json`. The README documents the v0.1.0 API.
- `lightweight-charts` is a `peerDependency`; consumers without it can `import { compile, generate, buildPlan }` without runtime error.

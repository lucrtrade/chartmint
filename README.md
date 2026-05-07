# @lucrtrade/chartmint

[![CI](https://github.com/lucrtrade/chartmint/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/lucrtrade/chartmint/actions/workflows/ci.yml) [![npm version](https://img.shields.io/npm/v/%40lucrtrade%2Fchartmint)](https://www.npmjs.com/package/@lucrtrade/chartmint) [![license](https://img.shields.io/npm/l/%40lucrtrade%2Fchartmint)](https://www.npmjs.com/package/@lucrtrade/chartmint) [![bundle size](https://img.shields.io/bundlephobia/minzip/%40lucrtrade%2Fchartmint)](https://bundlephobia.com/package/@lucrtrade/chartmint) [![NPM Last Update](https://img.shields.io/npm/last-update/%40lucrtrade%2Fchartmint)](https://www.npmjs.com/package/@lucrtrade/chartmint)

A DSL-driven library for defining trading concepts, generating synthetic OHLC examples that satisfy them, and rendering explanatory charts via [Lightweight Charts](https://www.npmjs.com/package/lightweight-charts).

ESM-only. `lightweight-charts` is an optional `peerDependency` — required only if you use `applyToChart`.

## Install

```bash
bun add @lucrtrade/chartmint
# or
npm install @lucrtrade/chartmint

# Required only if you use `applyToChart`:
bun add lightweight-charts
```

## Headless quick-start

```ts
import { compile, generate, buildPlan, patterns } from "@lucrtrade/chartmint";

const compiled = compile(patterns.bullish_fvg.source);
const result = generate(patterns.bullish_fvg, { seed: 42 });
const plan = buildPlan(result, compiled.semantic!);

console.log(plan.candles.length); // 30
console.log(plan.zones[0]); // { name: "gap", time1, price1, time2, price2, color, ... }
console.log(result.verification.must); // [ { predicate, passed: true } ]
```

## Browser quick-start

```ts
import { createChart } from "lightweight-charts";
import { compile, generate, buildPlan, applyToChart, patterns } from "@lucrtrade/chartmint";

const chart = createChart(document.getElementById("chart")!);
const compiled = compile(patterns.bullish_fvg.source);
const result = generate(patterns.bullish_fvg, { seed: 42 });
applyToChart(chart, buildPlan(result, compiled.semantic!));
```

## DSL surface (v0.1.0)

```txt
pattern <name>
bars <id>(, <id>)*
[series <int>]                # default 30
[seed (<int> | random)]       # default random
must <predicate>
should <predicate | hint>
derive <obj>.<prop> = <expr>
when <predicate> then <obj>.<prop> = (<expr> | <ident>)
draw <derived-name> as (box | line) [<color>]
label <bar-id> as <text>

# expressions
<bar>.<open|high|low|close> | <number> | (body|range|mid)(<bar>) | <expr> (+|-|*|/) <expr>

# predicates
<expr> <op> <expr>           # op = < | > | <= | >= | =
direction(<bar>) = (bullish | bearish)

# hints (named registry — these reshape generation)
force_bullish <bar> | force_bearish <bar> | impulsive <bar>
body_ratio <bar> >= <number>
equal_highs <a> <b> | equal_lows <a> <b>

# colors
amber | blue | green | red | gray | white
```

## Patterns shipped in v0.1.0

| Pattern       | Concept                      | Drawkind |
| ------------- | ---------------------------- | -------- |
| `bullish_fvg` | 3-bar gap (`a.high < c.low`) | box      |
| `bullish_bos` | Break of prior high          | line     |
| `equal_highs` | Two near-equal highs         | line     |

## API

```ts
import {
  compile, // (source: string) => CompileResult
  generate, // (specOrSource: CompileResult | string | PatternTemplate, opts?) => GenerateResult
  buildPlan, // (result: GenerateResult, model: SemanticModel) => RenderPlan
  applyToChart, // (chart: IChartApi, plan: RenderPlan) => RenderHandles
  patterns, // { bullish_fvg, bullish_bos, equal_highs }
  CompileError,
  GenerationError,
  RenderError,
} from "@lucrtrade/chartmint";
```

`compile` never throws — it returns `{ ast?, semantic?, errors: CompileError[] }`. `generate` throws `GenerationError(kind: "must_failed")` on a `must` failure that survives the one-shot repair pass; retry with a new seed.

## Develop

```bash
bun install
bun run dev | build | test | test:watch | lint | format | typecheck | ci
```

## Release

See `docs/superpowers/specs/2026-05-07-chartmint-v0.1.0-design.md` for the full design and `.github/workflows/release.yml` for the publish pipeline (npm Trusted Publishing + GitHub Packages + GitHub Release).

## License

MIT

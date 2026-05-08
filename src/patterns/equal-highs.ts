import type { PatternTemplate } from "../generator/generate";

export const equalHighs: PatternTemplate = {
  name: "equal_highs",
  source: `pattern equal_highs
bars a, b
series 30
seed 42
should equal_highs a b
derive eqh.level = a.high
draw eqh as line gray
label a as liquidity
label b as liquidity
locate a at mid
locate b at end - 1
`,
};

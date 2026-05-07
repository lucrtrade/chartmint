import type { PatternTemplate } from "../generator/generate";

export const bullishFvg: PatternTemplate = {
  name: "bullish_fvg",
  source: `pattern bullish_fvg
bars a, b, c
series 30
seed 42
must a.high < c.low
should force_bullish b
should body_ratio b >= 0.65
derive gap.low = a.high
derive gap.high = c.low
draw gap as box amber
label b as displacement
`,
  mapping: (bars) => ({
    a: bars.length - 3,
    b: bars.length - 2,
    c: bars.length - 1,
  }),
};

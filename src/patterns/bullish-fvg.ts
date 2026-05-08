import type { PatternTemplate } from "../generator/generate";

export const bullishFvg: PatternTemplate = {
  name: "bullish_fvg",
  source: `pattern bullish_fvg
bars pre2, pre1, a, b, c, post1
series 45
seed 1352
must a.high < c.low
should force_bearish pre2
should force_bearish pre1
should impulsive b
should force_bullish b
should body_ratio b >= 0.75
should force_bullish c
should force_bullish post1
derive gap.low = a.high
derive gap.high = c.low
derive midline.level = (a.high + c.low) / 2
draw gap as box amber
draw midline as line white
label a as left_wall amber
label b as displacement green
label c as right_wall blue
locate pre2 at end - 5
locate pre1 at end - 4
locate a at end - 3
locate b at end - 2
locate c at end - 1
locate post1 at end
`,
};

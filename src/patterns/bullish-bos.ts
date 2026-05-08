import type { PatternTemplate } from "../generator/generate";

export const bullishBos: PatternTemplate = {
  name: "bullish_bos",
  source: `pattern bullish_bos
bars prev, brk
series 30
seed 42
must brk.close > prev.high
should impulsive brk
derive bos.level = prev.high
draw bos as line green
label brk as bos
locate prev as highest high within 0 0.8
locate brk at end
`,
};

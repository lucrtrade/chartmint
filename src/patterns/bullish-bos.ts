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
`,
  mapping: (bars) => {
    const limit = Math.floor(bars.length * 0.8);
    let bestIdx = 0;
    let bestHigh = -Infinity;
    for (let i = 0; i < limit; i++) {
      const h = bars[i]!.high;
      if (h > bestHigh) {
        bestHigh = h;
        bestIdx = i;
      }
    }
    return { prev: bestIdx, brk: bars.length - 1 };
  },
};

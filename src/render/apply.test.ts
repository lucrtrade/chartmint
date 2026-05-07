// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { createChart } from "lightweight-charts";
import { compile } from "../compile";
import { generate } from "../generator/generate";
import { buildPlan } from "./plan-builder";
import { patterns } from "../patterns";
import { applyToChart } from "./apply";

describe("applyToChart (jsdom + lightweight-charts)", () => {
  it("renders a bullish_fvg plan without throwing", () => {
    const container = document.createElement("div");
    Object.defineProperty(container, "clientWidth", { value: 600, configurable: true });
    Object.defineProperty(container, "clientHeight", { value: 400, configurable: true });
    document.body.appendChild(container);
    const chart = createChart(container, { width: 600, height: 400 });

    const compiled = compile(patterns.bullish_fvg.source);
    const result = generate(patterns.bullish_fvg, { seed: 42 });
    const plan = buildPlan(result, compiled.semantic!);

    const handles = applyToChart(chart, plan);

    expect(handles.candleSeries).toBeDefined();
    expect(handles.lineSeries).toEqual([]);
    expect(handles.zonePrimitives).toHaveLength(1);
    expect(handles.markersHandle).toBeDefined();

    chart.remove();
  });
});

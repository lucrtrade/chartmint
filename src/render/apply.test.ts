// @vitest-environment jsdom
import { beforeAll, describe, expect, it } from "vitest";
import { createChart } from "lightweight-charts";
import { compile } from "../compile";
import { generate } from "../generator/generate";
import { buildPlan } from "./plan-builder";
import { patterns } from "../patterns";
import { applyToChart } from "./apply";

beforeAll(() => {
  // jsdom does not implement HTMLCanvasElement.getContext. Stub it with a
  // minimal CanvasRenderingContext2D-shaped no-op so lightweight-charts can
  // construct and tear down its widgets without polluting stderr.
  const noop = () => {};
  window.matchMedia =
    window.matchMedia ??
    ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: noop,
      removeListener: noop,
      addEventListener: noop,
      removeEventListener: noop,
      dispatchEvent: () => false,
    }));
  const fakeCtx: Record<string, unknown> = {
    canvas: {},
    save: noop,
    restore: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    rect: noop,
    fill: noop,
    stroke: noop,
    fillRect: noop,
    strokeRect: noop,
    clearRect: noop,
    fillText: noop,
    strokeText: noop,
    measureText: () => ({ width: 0 }),
    setTransform: noop,
    transform: noop,
    translate: noop,
    scale: noop,
    rotate: noop,
    drawImage: noop,
    getImageData: () => ({ data: new Uint8ClampedArray(0) }),
    putImageData: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: () => null,
    arc: noop,
    arcTo: noop,
    clip: noop,
    quadraticCurveTo: noop,
    bezierCurveTo: noop,
  };
  (HTMLCanvasElement.prototype.getContext as unknown as () => unknown) = () => fakeCtx;
});

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
    expect(handles.lineSeries).toHaveLength(1);
    expect(handles.zonePrimitives).toHaveLength(1);
    expect(handles.markersHandle).toBeDefined();

    chart.remove();
  });
});

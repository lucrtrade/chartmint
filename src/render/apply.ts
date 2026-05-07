import {
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type ISeriesPrimitive,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import { RenderError } from "../errors";
import type { RenderPlan } from "./plan";

export type RenderHandles = {
  candleSeries: ISeriesApi<"Candlestick">;
  lineSeries: ISeriesApi<"Line">[];
  zonePrimitives: ISeriesPrimitive<Time>[];
  markersHandle: ReturnType<typeof createSeriesMarkers>;
};

export function applyToChart(chart: IChartApi, plan: RenderPlan): RenderHandles {
  const candleSeries = chart.addSeries(CandlestickSeries, {});
  candleSeries.setData(
    plan.candles.map((c) => ({
      time: c.time as unknown as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    })),
  );

  const lineSeries: ISeriesApi<"Line">[] = [];
  for (const level of plan.levels) {
    const series = chart.addSeries(LineSeries, {
      color: level.color,
      lineWidth: (level.lineWidth ?? 2) as 1 | 2 | 3 | 4,
    });
    const first = plan.candles[0];
    const last = plan.candles[plan.candles.length - 1];
    if (!first || !last) {
      throw new RenderError("missing_overlay_target", "no candles in plan");
    }
    series.setData([
      { time: first.time as unknown as Time, value: level.price },
      { time: last.time as unknown as Time, value: level.price },
    ]);
    lineSeries.push(series);
  }

  const zonePrimitives: ISeriesPrimitive<Time>[] = [];
  for (const _zone of plan.zones) {
    const prim: ISeriesPrimitive<Time> = {
      updateAllViews: () => {},
    };
    candleSeries.attachPrimitive(prim);
    zonePrimitives.push(prim);
  }

  const markers: SeriesMarker<Time>[] = plan.markers.map((m) => ({
    time: m.time as unknown as Time,
    position: m.position,
    shape: m.shape,
    color: m.color ?? "#3b82f6",
    text: m.text,
  }));
  const markersHandle = createSeriesMarkers(candleSeries, markers);

  return { candleSeries, lineSeries, zonePrimitives, markersHandle };
}

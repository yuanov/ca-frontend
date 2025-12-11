import React, { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart as RLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Helper: align array of raw values to dates by left-padding nulls
function alignToDates(datesOnly, values) {
  const total = datesOnly.length;
  const arr = Array.isArray(values) ? values : [];
  const pad = Math.max(0, total - arr.length);
  const aligned = Array(pad).fill(null).concat(arr).slice(0, total);
  return datesOnly.map((x, i) => {
    const v = aligned[i];
    return { x, y: v == null ? null : Number(v) };
  });
}

// Fetch indicators data (EMA7/14/21, MACD, Sigma, Histogram, RSI14) for a given id
async function fetchIndicatorData(id) {
  const url = `http://localhost:3000/indicators/volume/${id}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json();

  if (!json?.dates) {
    throw new Error("Некорректный ответ API (ожидалось поле dates)");
  }

  const datesOnly = json.dates.map((d) => String(d).split("T")[0]);

  const ema7 = alignToDates(datesOnly, json.ema7);
  const ema14 = alignToDates(datesOnly, json.ema14);
  const ema21 = alignToDates(datesOnly, json.ema21);
  const macd = alignToDates(datesOnly, json.macd);
  const sigma = alignToDates(datesOnly, json.sigma);
  const histogram = alignToDates(datesOnly, json.histogram);
  const rsi14 = alignToDates(datesOnly, json.rsi14);

  return { ema7, ema14, ema21, macd, sigma, histogram, rsi14 };
}

function plotData(data) {
  let min = Infinity,
    max = -Infinity;
  for (const p of data) {
    const v = p?.y;
    if (typeof v === "number" && isFinite(v)) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  }
  if (!isFinite(min) || !isFinite(max)) return [0, 1];
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.1;
  return [min - pad, max + pad];
}

// Combine multiple series arrays (each as [{x, y}]) into a single array of rows by x
// Example: combineByX({ a: [{x:'2025-01-01', y:1}], b: [...] }) => [{ x:'2025-01-01', a:1, b:... }]
function combineByX(seriesMap) {
  const acc = new Map();
  for (const [key, arr] of Object.entries(seriesMap)) {
    if (!Array.isArray(arr)) continue;
    for (const p of arr) {
      const row = acc.get(p.x) || { x: p.x };
      row[key] = p.y;
      acc.set(p.x, row);
    }
  }
  return Array.from(acc.values()).sort((a, b) => (a.x < b.x ? -1 : a.x > b.x ? 1 : 0));
}

function plotDataMulti(rows, keys) {
  let min = Infinity,
    max = -Infinity;
  for (const row of rows) {
    for (const k of keys) {
      const v = row[k];
      if (typeof v === "number" && isFinite(v)) {
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
  }
  if (!isFinite(min) || !isFinite(max)) return [0, 1];
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.1;
  return [min - pad, max + pad];
}

// Volume Indicator Chart (индикаторы: EMA14, MACD)
export default function VolumeIndicatorChart({
  id,
  width = 720,
  height = 800,
  showLabels = true,
}) {
    const [ema7Data, setEma7Data] = useState([]);
    const [ema14Data, setEma14Data] = useState([]);
    const [ema21Data, setEma21Data] = useState([]);
    const [macdData, setMacdData] = useState([]);
    const [sigmaData, setSigmaData] = useState([]);
    const [histogramData, setHistogramData] = useState([]);
    const [rsi14Data, setRsi14Data] = useState([]);
    const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const pts = await fetchIndicatorData(id);
          setEma7Data(pts.ema7 || []);
          setEma14Data(pts.ema14 || []);
          setEma21Data(pts.ema21 || []);
          setMacdData(pts.macd || []);
          setSigmaData(pts.sigma || []);
          setHistogramData(pts.histogram || []);
          setRsi14Data(pts.rsi14 || []);
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // Prepare combined datasets for multi-line charts
  const emaCombined = useMemo(
    () => combineByX({ ema7: ema7Data, ema14: ema14Data, ema21: ema21Data }),
    [ema7Data, ema14Data, ema21Data],
  );
  const macdCombined = useMemo(
    () => combineByX({ macd: macdData, sigma: sigmaData, histogram: histogramData }),
    [macdData, sigmaData, histogramData],
  );

  const [yMinEma, yMaxEma] = useMemo(
    () => plotDataMulti(emaCombined, ["ema7", "ema14", "ema21"]),
    [emaCombined],
  );
  const [yMinMacd, yMaxMacd] = useMemo(
    () => plotDataMulti(macdCombined, ["macd", "sigma", "histogram"]),
    [macdCombined],
  );
  const [yMinRsi, yMaxRsi] = useMemo(() => plotData(rsi14Data), [rsi14Data]);

  return (
    <div
      role="img"
      aria-label="Графики: EMA7/EMA14/EMA21, MACD/Sigma/Histogram, RSI14"
      style={{ width, height }}
    >
      {loading && <div style={{ padding: 12 }}>Загрузка данных…</div>}
      {error && (
        <div style={{ padding: 12, color: "#b91c1c" }}>
          Ошибка загрузки: {error}
        </div>
      )}
      {!loading && !error && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            gap: 8,
          }}
        >
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
            aria-label="График EMA 7/14/21"
          >
            {showLabels && (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#0ea5e9",
                  padding: "2px 4px",
                }}
              >
                EMA 7 / 14 / 21
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RLineChart
                  data={emaCombined}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="x"
                    type="category"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => String(v).slice(5)}
                  />
                  <YAxis
                    type="number"
                    domain={[yMinEma, yMaxEma]}
                    tickFormatter={(v) => Number(v.toFixed(2))}
                  />
                  <Tooltip
                    formatter={(value, name) => [Number(value).toFixed(4), name]}
                    labelFormatter={(lbl) => `Дата: ${lbl}`}
                  />
                  <Line type="monotone" dataKey="ema7" name="EMA7" stroke="#10b981" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="ema14" name="EMA14" stroke="#0ea5e9" dot={false} strokeWidth={2.2} />
                  <Line type="monotone" dataKey="ema21" name="EMA21" stroke="#f59e0b" dot={false} strokeWidth={2} />
                </RLineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
            aria-label="График MACD"
          >
            {showLabels && (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#ef4444",
                  padding: "2px 4px",
                }}
              >
                MACD / Sigma / Histogram
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RLineChart
                  data={macdCombined}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="x"
                    type="category"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => String(v).slice(5)}
                  />
                  <YAxis
                    type="number"
                    domain={[yMinMacd, yMaxMacd]}
                    tickFormatter={(v) => Number(v.toFixed(2))}
                  />
                  <Tooltip
                    formatter={(value, name) => [Number(value).toFixed(4), name]}
                    labelFormatter={(lbl) => `Дата: ${lbl}`}
                  />
                  <Line type="monotone" dataKey="macd" name="MACD" stroke="#ef4444" dot={false} strokeWidth={2.2} />
                  <Line type="monotone" dataKey="sigma" name="Sigma" stroke="#22c55e" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="histogram" name="Histogram" stroke="#a855f7" dot={false} strokeWidth={2} />
                </RLineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
            aria-label="График RSI 14"
          >
            {showLabels && (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#6366f1",
                  padding: "2px 4px",
                }}
              >
                RSI 14
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RLineChart
                  data={rsi14Data}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="x"
                    type="category"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => String(v).slice(5)}
                  />
                  <YAxis
                    type="number"
                    domain={[yMinRsi, yMaxRsi]}
                    tickFormatter={(v) => Number(v.toFixed(2))}
                  />
                  <Tooltip
                    formatter={(value) => [Number(value).toFixed(4), "RSI14"]}
                    labelFormatter={(lbl) => `Дата: ${lbl}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke="#6366f1"
                    dot={false}
                    strokeWidth={2.2}
                  />
                </RLineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

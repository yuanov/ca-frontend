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

// Паддинг больше не нужен: API возвращает массивы одинаковой длины (по параметру count)

// Fetch MCAP indicators data (ema21, ema50, roc21) for a given id
async function fetchIndicatorData(id) {
  const url = `http://localhost:3000/indicators/mcap/${id}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json();

  if (!json?.dates) {
    throw new Error("Некорректный ответ API (ожидалось поле dates)");
  }

  const datesOnly = json.dates.map((d) => String(d).split("T")[0]);

  const ema21 = datesOnly.map((x, i) => ({ x, y: Number(json.ema21?.[i]) }));
  const ema50 = datesOnly.map((x, i) => ({ x, y: Number(json.ema50?.[i]) }));
  const roc21 = datesOnly.map((x, i) => ({ x, y: Number(json.roc21?.[i]) }));

  return { ema21, ema50, roc21 };
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

// MCAP Indicator Chart
export default function McapIndicatorChart({
  id,
  width = 720,
  height = 800,
  showLabels = true,
}) {
  const [ema21Data, setEma21Data] = useState([]);
  const [ema50Data, setEma50Data] = useState([]);
  const [roc21Data, setRoc21Data] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // зум
  const [count, setCount] = useState(60);
  const [range, setRange] = useState({ startIndex: null, endIndex: null });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const url = `http://localhost:3000/indicators/mcap/${id}?count=${encodeURIComponent(count)}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (!json?.dates) throw new Error("Некорректный ответ API (ожидалось поле dates)");
        const datesOnly = json.dates.map((d) => String(d).split("T")[0]);
        const ema21 = datesOnly.map((x, i) => ({ x, y: Number(json.ema21?.[i]) }));
        const ema50 = datesOnly.map((x, i) => ({ x, y: Number(json.ema50?.[i]) }));
        const roc21 = datesOnly.map((x, i) => ({ x, y: Number(json.roc21?.[i]) }));

        setEma21Data(ema21 || []);
        setEma50Data(ema50 || []);
        setRoc21Data(roc21 || []);
        const n = datesOnly.length;
        const windowSize = Math.min(count, n);
        setRange({ startIndex: Math.max(0, n - windowSize), endIndex: Math.max(0, n - 1) });
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, count]);

  // Prepare combined datasets for multi-line charts
  const emaCombined = useMemo(
    () => combineByX({ ema21: ema21Data, ema50: ema50Data }),
    [ema21Data, ema50Data],
  );

  // диапазон отображения
  const displaySlice = useMemo(() => {
    const n = emaCombined.length || roc21Data.length;
    const { startIndex, endIndex } = range || {};
    if (
      Number.isInteger(startIndex) &&
      Number.isInteger(endIndex) &&
      startIndex >= 0 &&
      endIndex >= startIndex &&
      endIndex < n
    ) {
      return { start: startIndex, end: endIndex };
    }
    return { start: 0, end: Math.max(0, n - 1) };
  }, [range, emaCombined, roc21Data]);

  const emaDisplay = useMemo(() => emaCombined.slice(displaySlice.start, displaySlice.end + 1), [emaCombined, displaySlice]);
  const rocDisplay = useMemo(() => roc21Data.slice(displaySlice.start, displaySlice.end + 1), [roc21Data, displaySlice]);

  const [yMinEma, yMaxEma] = useMemo(
    () => plotDataMulti(emaDisplay, ["ema21", "ema50"]),
    [emaDisplay],
  );
  const [yMinRoc, yMaxRoc] = useMemo(() => plotData(rocDisplay), [rocDisplay]);

  const PeriodButtons = () => {
    const presets = [
      { label: "1W", days: 7 },
      { label: "2W", days: 14 },
      { label: "1M", days: 30 },
      { label: "2M", days: 60 },
      { label: "3M", days: 90 },
      { label: "6M", days: 180 },
    ];
    const onPick = (days) => {
      if (count < days) {
        setCount(days);
      } else {
        const n = emaCombined.length;
        const start = Math.max(0, n - days);
        setRange({ startIndex: start, endIndex: Math.max(0, n - 1) });
      }
    };
    return (
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "#64748b" }}>Период:</span>
        {presets.map((p) => (
          <button
            key={p.label}
            onClick={() => onPick(p.days)}
            style={{ padding: "4px 8px", fontSize: 12, cursor: "pointer", border: "1px solid #cbd5e1", borderRadius: 4, background: "#fff" }}
          >
            {p.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div
      role="img"
      aria-label="MCAP: EMA21/EMA50, ROC21"
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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <PeriodButtons />
            <div style={{ fontSize: 12, color: "#64748b" }}>count: {count}</div>
          </div>
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
            aria-label="График EMA 21/50"
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
                EMA 21 / 50
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RLineChart
                  data={emaDisplay}
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
                  <Line type="monotone" dataKey="ema21" name="EMA21" stroke="#10b981" dot={false} strokeWidth={2} />
                  <Line type="monotone" dataKey="ema50" name="EMA50" stroke="#f59e0b" dot={false} strokeWidth={2} />
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
            aria-label="График ROC 21"
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
                ROC 21
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RLineChart data={rocDisplay} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="x"
                    type="category"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => String(v).slice(5)}
                  />
                  <YAxis
                    type="number"
                    domain={[yMinRoc, yMaxRoc]}
                    tickFormatter={(v) => Number(v.toFixed(2))}
                  />
                  <Tooltip
                    formatter={(value) => [Number(value).toFixed(4), "ROC21"]}
                    labelFormatter={(lbl) => `Дата: ${lbl}`}
                  />
                  <Line type="monotone" dataKey="y" stroke="#ef4444" dot={false} strokeWidth={2.2} />
                </RLineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

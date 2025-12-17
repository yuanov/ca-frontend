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

// Fetch indicators data for Volume (ema7, ema21, roc14, zscore14) for a given id
async function fetchIndicatorData(id) {
  const url = `http://localhost:3000/indicators/volume/${id}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json();

  if (!json?.dates) {
    throw new Error("Некорректный ответ API (ожидалось поле dates)");
  }

  const datesOnly = json.dates.map((d) => String(d).split("T")[0]);

  const ema7 = datesOnly.map((x, i) => ({ x, y: Number(json.ema7?.[i]) }));
  const ema21 = datesOnly.map((x, i) => ({ x, y: Number(json.ema21?.[i]) }));
  const roc14 = datesOnly.map((x, i) => ({ x, y: Number(json.roc14?.[i]) }));
  const zscore14 = datesOnly.map((x, i) => ({ x, y: Number(json.zscore14?.[i]) }));

  return { ema7, ema21, roc14, zscore14 };
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

// Форматирование меток оси Y в кратком виде (латиница K/M/B/T)
function formatShort(value) {
  if (value === 0) return "0";
  const abs = Math.abs(value);
  const sign = value < 0 ? -1 : 1;
  const units = [
    { v: 1e12, s: "T" },
    { v: 1e9, s: "B" },
    { v: 1e6, s: "M" },
    { v: 1e3, s: "K" },
  ];
  for (const u of units) {
    if (abs >= u.v) {
      const num = abs / u.v;
      let str = num.toFixed(num < 10 ? 2 : num < 100 ? 1 : 0);
      str = str.replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, "");
      return (sign < 0 ? "-" : "") + str + u.s;
    }
  }
  let s = abs.toFixed(abs < 10 ? 2 : abs < 100 ? 1 : 0);
  s = s.replace(/\.0+$|(?<=\.[0-9]*?)0+$/g, "");
  return (sign < 0 ? "-" : "") + s;
}

// Генерация «красивых» тиков по диапазону
function niceTicks(min, max, desired = 5) {
  if (!isFinite(min) || !isFinite(max)) return [0, 1];
  if (min === max) {
    const pad = Math.abs(min || 1) * 0.1 || 1;
    min -= pad;
    max += pad;
  }
  if (min > max) [min, max] = [max, min];
  const span = max - min;
  const step0 = span / Math.max(1, desired);
  const pow10 = Math.pow(10, Math.floor(Math.log10(step0)));
  const candidates = [1, 2, 2.5, 5].map((m) => m * pow10);
  let step = candidates[0];
  let bestDiff = Infinity;
  for (const c of candidates) {
    const cnt = Math.ceil(max / c) - Math.floor(min / c) + 1;
    const diff = Math.abs(cnt - desired);
    if (diff < bestDiff) {
      bestDiff = diff;
      step = c;
    }
  }
  const start = Math.ceil(min / step) * step;
  const end = Math.floor(max / step) * step;
  const ticks = [];
  for (let v = start; v <= end + step / 2; v += step) {
    const vv = Math.abs(v) < 1e-12 ? 0 : v;
    ticks.push(vv);
  }
  if (ticks.length === 0) return [min, max];
  return ticks;
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
  // данные
  const [ema7Data, setEma7Data] = useState([]);
  const [ema21Data, setEma21Data] = useState([]);
  const [roc14Data, setRoc14Data] = useState([]);
  const [zscore14Data, setZscore14Data] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // зум
  const [count, setCount] = useState(60); // стартовый период 60 дней
  const [range, setRange] = useState({ startIndex: null, endIndex: null }); // видимое окно

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        // добавляем ?count=N в запрос индикаторов
        const url = `http://localhost:3000/indicators/volume/${id}?count=${encodeURIComponent(count)}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        if (!json?.dates) throw new Error("Некорректный ответ API (ожидалось поле dates)");
        const datesOnly = json.dates.map((d) => String(d).split("T")[0]);
        const ema7 = datesOnly.map((x, i) => ({ x, y: Number(json.ema7?.[i]) }));
        const ema21 = datesOnly.map((x, i) => ({ x, y: Number(json.ema21?.[i]) }));
        const roc14 = datesOnly.map((x, i) => ({ x, y: Number(json.roc14?.[i]) }));
        const zscore14 = datesOnly.map((x, i) => ({ x, y: Number(json.zscore14?.[i]) }));

        setEma7Data(ema7 || []);
        setEma21Data(ema21 || []);
        setRoc14Data(roc14 || []);
        setZscore14Data(zscore14 || []);
        // после загрузки устанавливаем видимое окно на последние count точек
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
    () => combineByX({ ema7: ema7Data, ema21: ema21Data }),
    [ema7Data, ema21Data],
  );

  // применяем срез диапазона для отображения
  const displaySlice = useMemo(() => {
    const n = emaCombined.length || roc14Data.length || zscore14Data.length;
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
  }, [range, emaCombined, roc14Data, zscore14Data]);

  const emaDisplay = useMemo(() => emaCombined.slice(displaySlice.start, displaySlice.end + 1), [emaCombined, displaySlice]);
  const rocDisplay = useMemo(() => roc14Data.slice(displaySlice.start, displaySlice.end + 1), [roc14Data, displaySlice]);
  const zDisplay = useMemo(() => zscore14Data.slice(displaySlice.start, displaySlice.end + 1), [zscore14Data, displaySlice]);

  const [yMinEma, yMaxEma] = useMemo(
    () => plotDataMulti(emaDisplay, ["ema7", "ema21"]),
    [emaDisplay],
  );
  const [yMinRoc, yMaxRoc] = useMemo(() => plotData(rocDisplay), [rocDisplay]);
  const [yMinZ, yMaxZ] = useMemo(() => plotData(zDisplay), [zDisplay]);

  const yTicksEma = useMemo(() => niceTicks(yMinEma, yMaxEma, 5), [yMinEma, yMaxEma]);
  const yTicksRoc = useMemo(() => niceTicks(yMinRoc, yMaxRoc, 5), [yMinRoc, yMaxRoc]);
  const yTicksZ = useMemo(() => niceTicks(yMinZ, yMaxZ, 5), [yMinZ, yMaxZ]);

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
      aria-label="Графики: EMA7/EMA21, ROC14, Z-Score14"
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
            aria-label="График EMA 7/21"
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
                EMA 7 / 21
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
                    ticks={yTicksEma}
                    tickFormatter={formatShort}
                  />
                  <Tooltip
                    formatter={(value, name) => [Number(value).toFixed(4), name]}
                    labelFormatter={(lbl) => `Дата: ${lbl}`}
                  />
                  <Line type="monotone" dataKey="ema7" name="EMA7" stroke="#10b981" dot={false} strokeWidth={2} />
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
            aria-label="График ROC 14"
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
                ROC 14
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
                    ticks={yTicksRoc}
                    tickFormatter={formatShort}
                  />
                  <Tooltip
                    formatter={(value) => [Number(value).toFixed(4), "ROC14"]}
                    labelFormatter={(lbl) => `Дата: ${lbl}`}
                  />
                  <Line type="monotone" dataKey="y" stroke="#ef4444" dot={false} strokeWidth={2.2} />
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
            aria-label="График Z-Score 14"
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
                Z-Score 14
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RLineChart
                  data={zDisplay}
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
                    domain={[yMinZ, yMaxZ]}
                    ticks={yTicksZ}
                    tickFormatter={formatShort}
                  />
                  <Tooltip
                    formatter={(value) => [Number(value).toFixed(4), "Z-Score14"]}
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

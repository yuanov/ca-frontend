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

const metricToCoinsKey = {
  volume: "volume",
  mcap: "marketCap",
  "token-turnover": "tokenTurnover",
};

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

export default function SupportResistanceChart({
  id,
  metric, // 'volume' | 'mcap' | 'token-turnover'
  width = 720,
  height = 400,
  showLabels = true,
  count = 60,
  range = { startIndex: null, endIndex: null },
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const q = `?count=${encodeURIComponent(count)}`;
        const indicatorsUrl = `http://localhost:3000/indicators/${metric}/${id}${q}`;
        const coinsUrl = `http://localhost:3000/coins/${id}${q}`;

        const [indResp, coinsResp] = await Promise.all([
          fetch(indicatorsUrl),
          fetch(coinsUrl),
        ]);

        if (!indResp.ok) throw new Error(`HTTP ${indResp.status} (indicators)`);
        if (!coinsResp.ok) throw new Error(`HTTP ${coinsResp.status} (coins)`);

        const indJson = await indResp.json();
        const coinsJson = await coinsResp.json();
        
        if (!indJson?.dates || !indJson?.sr) {
          throw new Error("Некорректный ответ API (ожидалось поле sr)");
        }

        const datesOnly = indJson.dates.map((d) => String(d).split("T")[0]);
        const coinsKey = metricToCoinsKey[metric] || metric;
        const metricValues = coinsJson[coinsKey] || [];

        const combined = datesOnly.map((x, i) => ({
          x,
          support: Number(indJson.sr.support?.[i]),
          resistance: Number(indJson.sr.resistance?.[i]),
          value: Number(metricValues[i]),
        }));

        setData(combined);
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    if (id && metric) {
      load();
    }
  }, [id, metric, count]);

  const displayData = useMemo(() => {
    const { startIndex, endIndex } = range;
    if (
      Number.isInteger(startIndex) &&
      Number.isInteger(endIndex) &&
      startIndex >= 0 &&
      endIndex >= startIndex &&
      endIndex < data.length
    ) {
      return data.slice(startIndex, endIndex + 1);
    }
    return data;
  }, [data, range]);

  const [yMin, yMax] = useMemo(
    () => plotDataMulti(displayData, ["support", "resistance", "value"]),
    [displayData]
  );
  const yTicks = useMemo(() => niceTicks(yMin, yMax, 5), [yMin, yMax]);

  return (
    <div style={{ width, height, marginTop: 20 }}>
      {loading && <div style={{ padding: 12 }}>Загрузка S/R…</div>}
      {error && (
        <div style={{ padding: 12, color: "#b91c1c" }}>
          Ошибка загрузки S/R: {error}
        </div>
      )}
      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {showLabels && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#0ea5e9",
                padding: "2px 4px",
              }}
            >
              Support / Resistance & {metric.charAt(0).toUpperCase() + metric.slice(1)}
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RLineChart
                data={displayData}
                margin={{ top: 10, right: 20, bottom: 20, left: 20 }}
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
                  domain={[yMin, yMax]}
                  ticks={yTicks}
                  tickFormatter={formatShort}
                />
                <Tooltip
                  formatter={(value, name) => [Number(value).toFixed(4), name]}
                  labelFormatter={(lbl) => `Дата: ${lbl}`}
                />
                <Line
                  type="monotone"
                  dataKey="resistance"
                  name="Resistance"
                  stroke="#ef4444"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="support"
                  name="Support"
                  stroke="#22c55e"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="Metric Value"
                  stroke="#6366f1"
                  dot={false}
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
              </RLineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

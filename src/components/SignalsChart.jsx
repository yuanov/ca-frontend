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

// Align array of raw values to provided dates by left-padding nulls
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

const metricToCoinsKey = {
  volume: "volume",
  mcap: "marketCap",
  "token-turnover": "tokenTurnover",
};

export default function SignalsChart({
  id,
  metric, // 'volume' | 'mcap' | 'token-turnover'
  width = 720,
  height = 800,
  showLabels = true,
}) {
  const [series, setSeries] = useState([]); // [{x, y, signal: boolean, signals: string[] }]
  const [availableSignalNames, setAvailableSignalNames] = useState([]); // all keys present in response
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const coinsUrl = `http://localhost:3000/coins/${id}`;
        const signalsUrl = `http://localhost:3000/signals/${metric}/${id}`;

        const [coinsResp, sigResp] = await Promise.all([
          fetch(coinsUrl),
          fetch(signalsUrl),
        ]);
        if (!coinsResp.ok) throw new Error(`HTTP ${coinsResp.status} (coins)`);
        if (!sigResp.ok) throw new Error(`HTTP ${sigResp.status} (signals)`);

        const coins = await coinsResp.json();
        const sig = await sigResp.json();

        if (!coins?.dates || !coins?.volume) {
          throw new Error("Некорректный ответ API /coins");
        }
        if (!sig?.dates) {
          throw new Error("Некорректный ответ API /signals");
        }

        const datesOnly = coins.dates.map((d) => String(d).split("T")[0]);
        const coinsKey = metricToCoinsKey[metric] || metric;
        const baseValues = coins[coinsKey];
        const base = alignToDates(datesOnly, baseValues);

        // Collect all signal keys (non-"dates") and align each to base length
        const sigKeys = Object.keys(sig).filter((k) => k !== "dates");
        const total = datesOnly.length;

        const alignedByKey = {};
        for (const key of sigKeys) {
          const arr = Array.isArray(sig[key]) ? sig[key] : [];
          const pad = Math.max(0, total - arr.length);
          alignedByKey[key] = Array(pad)
            .fill(null)
            .concat(arr)
            .slice(0, total);
        }
        // Build combined rows with all triggered signals on each date
        const combined = base.map((row, i) => {
          const triggered = [];
          for (const key of sigKeys) {
            if (alignedByKey[key]?.[i] === true) triggered.push(key);
          }
          return {
            x: row.x,
            y: row.y,
            signal: triggered.length > 0,
            signals: triggered,
          };
        });

        setSeries(combined);
        setAvailableSignalNames(sigKeys);
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, metric]);

  const [yMin, yMax] = useMemo(() => plotData(series), [series]);

  // Custom dot: render only where any signal is true
  const renderDot = (props) => {
    const { cx, cy, payload } = props;
    if (!payload || !payload.signal) return null;
    return (
      <circle cx={cx} cy={cy} r={4} stroke="#ef4444" fill="#ef4444" />
    );
  };

  const titleMap = {
    volume: "Сигналы Volume",
    mcap: "Сигналы MCAP",
    "token-turnover": "Сигналы Token Turnover",
  };

  return (
    <div role="img" aria-label={titleMap[metric]} style={{ width, height }}>
      {loading && <div style={{ padding: 12 }}>Загрузка данных…</div>}
      {error && (
        <div style={{ padding: 12, color: "#b91c1c" }}>Ошибка: {error}</div>
      )}
      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {showLabels && (
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#22c55e",
                padding: "2px 4px",
              }}
            >
              {titleMap[metric]}
              {availableSignalNames?.length
                ? ` • ${availableSignalNames.join(", ")}`
                : ""}
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RLineChart data={series} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
                <YAxis domain={[yMin, yMax]} tick={{ fontSize: 12 }} width={60} />
                <Tooltip
                  labelFormatter={(x) => `Дата: ${x}`}
                  formatter={(value, name, props) => {
                    const { payload } = props;
                    if (name === "y") {
                      const parts = [value];
                      if (payload?.signals?.length) parts.push(payload.signals.join(", "));
                      return parts;
                    }
                    return value;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="y"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  dot={renderDot}
                  isAnimationActive={false}
                />
              </RLineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

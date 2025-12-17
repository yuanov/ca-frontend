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
  enableZoom = false, // включить панель выбора периода (без Brush)
}) {
  const [series, setSeries] = useState([]); // [{x, y, signal: boolean, signals: string[] }]
  const [availableSignalNames, setAvailableSignalNames] = useState([]); // all keys present in response
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(180); // сколько дней запрашивать у бэкенда
  // видимый диапазон индексов для отображаемого окна
  const [range, setRange] = useState({ startIndex: null, endIndex: null });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const q = `?count=${encodeURIComponent(count)}`;
        const coinsUrl = `http://localhost:3000/coins/${id}${q}`;
        const signalsUrl = `http://localhost:3000/signals/${metric}/${id}${q}`;

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
        const base = datesOnly.map((x, i) => ({ x, y: Number(baseValues?.[i]) }));

        // Collect all signal keys (non-"dates") без выравнивания — размеры совпадают
        const sigKeys = Object.keys(sig).filter((k) => k !== "dates");
        const byKey = sig;
        // Build combined rows with all triggered signals on each date
        const combined = base.map((row, i) => {
          const triggered = [];
          for (const key of sigKeys) {
            if (byKey[key]?.[i] === true) triggered.push(key);
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
        // после загрузки, если зум включён — установить диапазон на последние 180 (или count) точек
        if (enableZoom) {
          const n = combined.length;
          const windowSize = Math.min(180, n);
          setRange({ startIndex: Math.max(0, n - windowSize), endIndex: Math.max(0, n - 1) });
        } else {
          setRange({ startIndex: null, endIndex: null });
        }
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, metric, count, enableZoom]);

  const displaySeries = useMemo(() => {
    const { startIndex, endIndex } = range || {};
    if (
      enableZoom &&
      Number.isInteger(startIndex) &&
      Number.isInteger(endIndex) &&
      startIndex >= 0 &&
      endIndex >= startIndex &&
      endIndex < series.length
    ) {
      return series.slice(startIndex, endIndex + 1);
    }
    return series;
  }, [series, enableZoom, range]);

  const [yMin, yMax] = useMemo(() => plotData(displaySeries), [displaySeries]);

  // Custom dot: render only where any signal is true
  const renderDot = (props) => {
    const { cx, cy, payload } = props;
    if (!payload || !payload.signal) return null;
    return (
      <circle
        key={`sig-${props.index ?? payload?.x ?? cx}`}
        cx={cx}
        cy={cy}
        r={4}
        stroke="#ef4444"
        fill="#ef4444"
      />
    );
  };

  const titleMap = {
    volume: "Сигналы Volume",
    mcap: "Сигналы MCAP",
    "token-turnover": "Сигналы Token Turnover",
  };

  const PeriodButtons = () => {
    if (!enableZoom) return null;
    const presets = [
      { label: "1W", days: 7 },
      { label: "2W", days: 14 },
      { label: "1M", days: 30 },
      { label: "2M", days: 60 },
      { label: "3M", days: 90 },
      { label: "6M", days: 180 },
    ];
    const onPick = (days) => {
      // если текущего count не хватает — увеличим и перезагрузим данные
      if (count < days) {
        setCount(days);
        // диапазон выставим после загрузки (в useEffect), но на всякий случай подготовим
        const n = series.length;
        const start = Math.max(0, n - days);
        setRange({ startIndex: start, endIndex: Math.max(0, n - 1) });
      } else {
        const n = series.length;
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
            style={{
              padding: "4px 8px",
              fontSize: 12,
              cursor: "pointer",
              border: "1px solid #cbd5e1",
              borderRadius: 4,
              background: "#fff",
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div role="img" aria-label={titleMap[metric]} style={{ width, height }}>
      {loading && <div style={{ padding: 12 }}>Загрузка данных…</div>}
      {error && (
        <div style={{ padding: 12, color: "#b91c1c" }}>Ошибка: {error}</div>
      )}
      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: enableZoom ? 6 : 0 }}>
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
          {enableZoom && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <PeriodButtons />
              <div style={{ fontSize: 12, color: "#64748b" }}>count: {count}</div>
            </div>
          )}
          <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RLineChart data={displaySeries} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
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

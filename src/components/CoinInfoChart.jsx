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

async function fetchData(source, id, count) {
  const url = `http://localhost:3000/${source}/${id}?count=${encodeURIComponent(count)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json();

  // Парсинг для индикаторов: берём из полей ema14 и macd
  if (source === "indicators") {
    if (!json?.dates) {
      throw new Error("Некорректный ответ API (ожидалось поле dates)");
    }
    const datesOnly = json.dates.map((d) => String(d).split("T")[0]);
    const ema14 = datesOnly.map((x, i) => ({ x, y: Number(json.ema14?.[i]) }));
    const macd = datesOnly.map((x, i) => ({ x, y: Number(json.macd?.[i]) }));
    const price = Array.isArray(json.price)
      ? datesOnly.map((x, i) => ({ x, y: Number(json.price?.[i]) }))
      : [];
    return { ema14, macd, price };
  }

  // Парсинг для монет (прежнее поведение)
  if (!json?.dates || !json?.volume) throw new Error("Некорректный ответ API");

  const volumes = [];
  const marketCaps = [];
  const tokenTurnovers = [];
  const prices = [];
  for (let i = 0; i < json.dates.length; i++) {
    const dateOnly = json.dates[i].split("T")[0];
    volumes.push({
      x: dateOnly,
      y: Number(json["volume"][i]),
    });
    marketCaps.push({
      x: dateOnly,
      y: Number(json["marketCap"][i]),
    });
    tokenTurnovers.push({
      x: dateOnly,
      y: Number(json["tokenTurnover"][i]),
    });
    prices.push({
      x: dateOnly,
      y: Number(json["price"][i]),
    });
  }
  return { volumes, marketCaps, tokenTurnovers, prices };
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

export default function CoinInfoChart({
  id,
  source = "coins",
  width = 720,
  height = 800,
  showLabels = true,
}) {
  const [volData, setVolData] = useState([]);
  const [capData, setCapData] = useState([]);
  const [turnData, setTurnData] = useState([]);
  const [priceData, setPriceData] = useState([]);
  const [ema14Data, setEma14Data] = useState([]);
  const [macdData, setMacdData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // зум
  const [count, setCount] = useState(60);
  const [range, setRange] = useState({ startIndex: null, endIndex: null });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const pts = await fetchData(source, id, count);
        if (source === "indicators") {
          setEma14Data(pts.ema14 || []);
          setMacdData(pts.macd || []);
          setPriceData(pts.price || []);
          // очищаем неиспользуемые наборы
          setVolData([]);
          setCapData([]);
          setTurnData([]);
        } else {
          setVolData(pts.volumes);
          setCapData(pts.marketCaps);
          setTurnData(pts.tokenTurnovers);
          setPriceData(pts.prices);
          // очищаем индикаторы
          setEma14Data([]);
          setMacdData([]);
        }
        // установить окно отображения на последние count точек
        const n = (source === "indicators" ? (pts.ema14?.length || pts.macd?.length || pts.price?.length) : (pts.volumes?.length || pts.marketCaps?.length || pts.tokenTurnovers?.length || pts.prices?.length)) || 0;
        const windowSize = Math.min(count, n);
        setRange({ startIndex: Math.max(0, n - windowSize), endIndex: Math.max(0, n - 1) });
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id, source, count]);

  // вычисляем общий срез индексов для текущих данных
  const displaySlice = useMemo(() => {
    const n = (source === "indicators"
      ? (ema14Data.length || macdData.length || priceData.length)
      : (volData.length || capData.length || turnData.length || priceData.length)
    );
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
  }, [range, source, volData.length, capData.length, turnData.length, priceData.length, ema14Data.length, macdData.length]);

  // срезанные наборы
  const volDisplay = useMemo(() => volData.slice(displaySlice.start, displaySlice.end + 1), [volData, displaySlice]);
  const capDisplay = useMemo(() => capData.slice(displaySlice.start, displaySlice.end + 1), [capData, displaySlice]);
  const turnDisplay = useMemo(() => turnData.slice(displaySlice.start, displaySlice.end + 1), [turnData, displaySlice]);
  const priceDisplay = useMemo(() => priceData.slice(displaySlice.start, displaySlice.end + 1), [priceData, displaySlice]);
  const emaDisplay = useMemo(() => ema14Data.slice(displaySlice.start, displaySlice.end + 1), [ema14Data, displaySlice]);
  const macdDisplay = useMemo(() => macdData.slice(displaySlice.start, displaySlice.end + 1), [macdData, displaySlice]);

  const [yMinVol, yMaxVol] = useMemo(() => plotData(volDisplay), [volDisplay]);
  const [yMinCap, yMaxCap] = useMemo(() => plotData(capDisplay), [capDisplay]);
  const [yMinTurn, yMaxTurn] = useMemo(() => plotData(turnDisplay), [turnDisplay]);
  const [yMinPrice, yMaxPrice] = useMemo(() => plotData(priceDisplay), [priceDisplay]);
  const [yMinEma, yMaxEma] = useMemo(() => plotData(emaDisplay), [emaDisplay]);
  const [yMinMacd, yMaxMacd] = useMemo(() => plotData(macdDisplay), [macdDisplay]);

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
        const n = (source === "indicators"
          ? (ema14Data.length || macdData.length || priceData.length)
          : (volData.length || capData.length || turnData.length || priceData.length)
        );
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
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#64748b" }}>count: {count}</div>
      </div>
    );
  };

  return (
    <div
      role="img"
      aria-label={
        source === "indicators"
          ? "Графики: EMA14 и MACD"
          : "Графики: объем, капитализация, оборот и цена"
      }
      style={{ width, height }}
    >
      {loading && <div style={{ padding: 12 }}>Загрузка данных…</div>}
      {error && (
        <div style={{ padding: 12, color: "#b91c1c" }}>
          Ошибка загрузки: {error}
        </div>
      )}
      {!loading && !error && source !== "indicators" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            gap: 8,
          }}
        >
          <PeriodButtons />
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
            aria-label="График объема"
          >
            {showLabels && (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#4f46e5",
                  padding: "2px 4px",
                }}
              >
                Объем
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RLineChart
                  data={volDisplay}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="x"
                    type="category"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis
                    type="number"
                    domain={[yMinVol, yMaxVol]}
                    tickFormatter={(v) => Number(v.toFixed(2))}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      Number(value).toFixed(4),
                      name === "y" ? "курс" : name,
                    ]}
                    labelFormatter={(lbl) => `Дата: ${lbl}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke="#4f46e5"
                    dot={false}
                    strokeWidth={2.5}
                  />
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
            aria-label="График рыночной капитализации"
          >
            {showLabels && (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#16a34a",
                  padding: "2px 4px",
                }}
              >
                Рыночная капитализация
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RLineChart
                  data={capDisplay}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="x"
                    type="category"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis
                    type="number"
                    domain={[yMinCap, yMaxCap]}
                    tickFormatter={(v) => Number(v.toFixed(2))}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      Number(value).toFixed(4),
                      name === "y" ? "курс" : name,
                    ]}
                    labelFormatter={(lbl) => `Дата: ${lbl}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke="#16a34a"
                    dot={false}
                    strokeWidth={2.5}
                  />
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
            aria-label="График оборачиваемости токена"
          >
            {showLabels && (
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#f59e0b",
                  padding: "2px 4px",
                }}
              >
                Оборачиваемость токена
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RLineChart
                  data={turnDisplay}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="x"
                    type="category"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis
                    type="number"
                    domain={[yMinTurn, yMaxTurn]}
                    tickFormatter={(v) => Number(v.toFixed(2))}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      Number(value).toFixed(4),
                      name === "y" ? "курс" : name,
                    ]}
                    labelFormatter={(lbl) => `Дата: ${lbl}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke="#f59e0b"
                    dot={false}
                    strokeWidth={2.5}
                  />
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
            aria-label="График цены"
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
                Цена
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RLineChart
                  data={priceDisplay}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="x"
                    type="category"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis
                    type="number"
                    domain={[yMinPrice, yMaxPrice]}
                    tickFormatter={(v) => Number(v.toFixed(2))}
                  />
                  <Tooltip
                    formatter={(value, name) => [
                      Number(value).toFixed(4),
                      name === "y" ? "курс" : name,
                    ]}
                    labelFormatter={(lbl) => `Дата: ${lbl}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke="#ef4444"
                    dot={false}
                    strokeWidth={2.5}
                  />
                </RLineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
      {!loading && !error && source === "indicators" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            gap: 8,
          }}
        >
          <PeriodButtons />
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
            aria-label="График EMA 14"
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
                EMA 14
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
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis
                    type="number"
                    domain={[yMinEma, yMaxEma]}
                    tickFormatter={(v) => Number(v.toFixed(2))}
                  />
                  <Tooltip
                    formatter={(value) => [Number(value).toFixed(4), "EMA14"]}
                    labelFormatter={(lbl) => `Дата: ${lbl}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke="#0ea5e9"
                    dot={false}
                    strokeWidth={2.5}
                  />
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
                MACD
              </div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RLineChart
                  data={macdDisplay}
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="x"
                    type="category"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis
                    type="number"
                    domain={[yMinMacd, yMaxMacd]}
                    tickFormatter={(v) => Number(v.toFixed(2))}
                  />
                  <Tooltip
                    formatter={(value) => [Number(value).toFixed(4), "MACD"]}
                    labelFormatter={(lbl) => `Дата: ${lbl}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="y"
                    stroke="#ef4444"
                    dot={false}
                    strokeWidth={2.5}
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

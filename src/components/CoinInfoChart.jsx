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

async function fetchData(id) {
  const url = `http://localhost:3000/coins/${id}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const json = await resp.json();
  if (!json?.dates || !json?.volume) throw new Error("Некорректный ответ API");

    const volumes = [];
    const marketCaps = [];
    const tokenTurnovers = [];
    const prices = [];
    for (let i = 0; i < json.dates.length; i++) {
        volumes.push({
            x: json.dates[i],
            y: Number(json['volume'][i])
        });
        marketCaps.push({
            x: json.dates[i],
            y: Number(json['marketCap'][i])
        });
        tokenTurnovers.push({
            x: json.dates[i],
            y: Number(json['tokenTurnover'][i])
        });
        prices.push({
            x: json.dates[i],
            y: Number(json['price'][i])
        });
    }
    return {volumes, marketCaps, tokenTurnovers, prices};
}

function plotData(data) {
  let min = Infinity,
    max = -Infinity;
  for (const p of data) {
    if (p.y < min) min = p.y;
    if (p.y > max) max = p.y;
  }
  if (!isFinite(min) || !isFinite(max)) return [0, 1];
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.1;
  return [min - pad, max + pad];
}

export default function CoinInfoChart({ id, width = 720, height = 800, showLabels = true }) {
  const [volData, setVolData] = useState([]);
  const [capData, setCapData] = useState([]);
  const [turnData, setTurnData] = useState([]);
  const [priceData, setPriceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const pts = await fetchData(id);
        setVolData(pts.volumes);
        setCapData(pts.marketCaps);
        setTurnData(pts.tokenTurnovers);
        setPriceData(pts.prices);
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);

  const [yMinVol, yMaxVol] = useMemo(() => plotData(volData), [volData]);
  const [yMinCap, yMaxCap] = useMemo(() => plotData(capData), [capData]);
  const [yMinTurn, yMaxTurn] = useMemo(() => plotData(turnData), [turnData]);
  const [yMinPrice, yMaxPrice] = useMemo(() => plotData(priceData), [priceData]);

  return (
    <div role="img" aria-label="Графики: объем, капитализация, оборот и цена" style={{ width, height }}>
      {loading && <div style={{ padding: 12 }}>Загрузка данных…</div>}
      {error && (
        <div style={{ padding: 12, color: "#b91c1c" }}>
          Ошибка загрузки: {error}
        </div>
      )}
      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 8 }}>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }} aria-label="График объема">
            {showLabels && (
              <div style={{ fontSize: 13, fontWeight: 600, color: "#4f46e5", padding: "2px 4px" }}>Объем</div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RLineChart data={volData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" type="category" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis type="number" domain={[yMinVol, yMaxVol]} tickFormatter={(v) => Number(v.toFixed(2))} />
                <Tooltip
                  formatter={(value, name) => [Number(value).toFixed(4), name === "y" ? "курс" : name]}
                  labelFormatter={(lbl) => `Дата: ${lbl}`}
                />
                <Line type="monotone" dataKey="y" stroke="#4f46e5" dot={false} strokeWidth={2.5} />
              </RLineChart>
            </ResponsiveContainer>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }} aria-label="График рыночной капитализации">
            {showLabels && (
              <div style={{ fontSize: 13, fontWeight: 600, color: "#16a34a", padding: "2px 4px" }}>Рыночная капитализация</div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RLineChart data={capData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" type="category" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis type="number" domain={[yMinCap, yMaxCap]} tickFormatter={(v) => Number(v.toFixed(2))} />
                <Tooltip
                  formatter={(value, name) => [Number(value).toFixed(4), name === "y" ? "курс" : name]}
                  labelFormatter={(lbl) => `Дата: ${lbl}`}
                />
                <Line type="monotone" dataKey="y" stroke="#16a34a" dot={false} strokeWidth={2.5} />
              </RLineChart>
            </ResponsiveContainer>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }} aria-label="График оборачиваемости токена">
            {showLabels && (
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b", padding: "2px 4px" }}>Оборачиваемость токена</div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RLineChart data={turnData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" type="category" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis type="number" domain={[yMinTurn, yMaxTurn]} tickFormatter={(v) => Number(v.toFixed(2))} />
                <Tooltip
                  formatter={(value, name) => [Number(value).toFixed(4), name === "y" ? "курс" : name]}
                  labelFormatter={(lbl) => `Дата: ${lbl}`}
                />
                <Line type="monotone" dataKey="y" stroke="#f59e0b" dot={false} strokeWidth={2.5} />
              </RLineChart>
            </ResponsiveContainer>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }} aria-label="График цены">
            {showLabels && (
              <div style={{ fontSize: 13, fontWeight: 600, color: "#ef4444", padding: "2px 4px" }}>Цена</div>
            )}
            <div style={{ flex: 1, minHeight: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <RLineChart data={priceData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" type="category" tick={{ fontSize: 12 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis type="number" domain={[yMinPrice, yMaxPrice]} tickFormatter={(v) => Number(v.toFixed(2))} />
                <Tooltip
                  formatter={(value, name) => [Number(value).toFixed(4), name === "y" ? "курс" : name]}
                  labelFormatter={(lbl) => `Дата: ${lbl}`}
                />
                <Line type="monotone" dataKey="y" stroke="#ef4444" dot={false} strokeWidth={2.5} />
              </RLineChart>
            </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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

  return json.dates.map((date, index) => ({
    x: date,
    y: Number(json.volume[index]),
  }));
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

export default function CoinInfoChart({ id, width = 720, height = 360 }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const pts = await fetchData(id);
        setData(pts);
      } catch (e) {
        setError(e.message || String(e));
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const [yMin, yMax] = useMemo(() => plotData(data), [data]);

  return (
    <div
      role="img"
      aria-label="График данных с локального сервера"
      style={{ width, height }}
    >
      {loading && <div style={{ padding: 12 }}>Загрузка данных…</div>}
      {error && (
        <div style={{ padding: 12, color: "#b91c1c" }}>
          Ошибка загрузки: {error}
        </div>
      )}
      {!loading && !error && (
        <ResponsiveContainer width="100%" height="100%">
          <RLineChart
            data={data}
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
              domain={[yMin, yMax]}
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
      )}
    </div>
  );
}

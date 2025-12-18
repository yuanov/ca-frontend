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
import { PRESET_TOKENS } from "./coinSelection.js";

// Справочник соответствия кнопкам/лейблам адресов для параметра address
// Если нужного ключа нет — компонент отобразит пустой график с подписью
const ADDRESS_BY_LABEL = {
  uni: "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",
  strk: "0x1c5db575e2ff833e46a2d0edd194b331a52efb9a",
  zec: "0x1c5db575e2ff833e46a2d0edd194b331a52efb9a",
  bnb: "0xB8c77482e45F1F44dE1745F52C74426C631bDD52",
  hype: "0xa477be503f3d608f8688f3cd66b56af0f2cf0509",
  avnt: "0x696f9436b67233384889472cd7cd58a6fb5df4f1",
  base: "0x90cbe4bdd538d6e9b379bff5fe72c3d67a521de5",
};

function getLabelByCoinId(coinId) {
  const m = PRESET_TOKENS.find((p) => p.id === coinId);
  return m?.label || undefined;
}

function toAddressByCoinId(coinId) {
  const label = getLabelByCoinId(coinId);
  if (!label) return undefined;
  const key = String(label).toLowerCase();
  return ADDRESS_BY_LABEL[key];
}

function normalizeSeries(dates, arr) {
  // Возвращаем массив объектов { x, y }
  if (!Array.isArray(dates) || !Array.isArray(arr)) return [];
  const out = [];
  const n = Math.min(dates.length, arr.length);
  for (let i = 0; i < n; i++) {
    const x = String(dates[i]).split("T")[0];
    const y = Number(arr[i]);
    out.push({ x, y: Number.isFinite(y) ? y : null });
  }
  return out;
}

function toChartData(dates, inflows, outflows, netflows) {
  const a = normalizeSeries(dates, inflows);
  const b = normalizeSeries(dates, outflows);
  const c = normalizeSeries(dates, netflows);
  // Объединяем по индексу в один массив для Recharts
  const n = Math.max(a.length, b.length, c.length);
  const rows = [];
  for (let i = 0; i < n; i++) {
    rows.push({
      x: a[i]?.x || b[i]?.x || c[i]?.x,
      inflows: a[i]?.y ?? null,
      outflows: b[i]?.y ?? null,
      netflows: c[i]?.y ?? null,
    });
  }
  return rows;
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

export default function TokenFlowsChart({ coinId, count = 60, height = 420 }) {
  const address = useMemo(() => toAddressByCoinId(coinId), [coinId]);
  const [state, setState] = useState({
    loading: false,
    error: null,
    data: [],
  });

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!address) {
        setState({ loading: false, error: null, data: [] });
        return;
      }
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const url = `http://localhost:3000/token/flows?address=${encodeURIComponent(
          address
        )}&count=${encodeURIComponent(count)}`;
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        // Ожидаем поля: dates, inflows, outflows, netflows
        const dates = json?.dates ?? json?.x ?? [];
        const inflows = json?.inflows ?? json?.in ?? [];
        const outflows = json?.outflows ?? json?.out ?? [];
        const netflows = json?.netflows ?? json?.net ?? [];
        const rows = toChartData(dates, inflows, outflows, netflows);
        if (!cancelled) setState({ loading: false, error: null, data: rows });
      } catch (e) {
        if (!cancelled) setState({ loading: false, error: e?.message || String(e), data: [] });
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [address, count]);

  const { loading, error, data } = state;
  const noMapping = !address;
  const empty = !data || data.length === 0;

  return (
    <div style={{ width: "100%", height }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <strong>Token Flows</strong>
        <span className="caption">inflows / outflows / netflows</span>
        <div style={{ flex: 1 }} />
        {noMapping && (
          <span className="caption" style={{ color: "#a00" }}>
            нет в справочнике
          </span>
        )}
        {loading && <span className="caption">загрузка…</span>}
        {error && (
          <span className="caption" title={String(error)} style={{ color: "#a00" }}>
            ошибка загрузки
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <RLineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="x" tick={{ fontSize: 12 }} minTickGap={24} />
          <YAxis tickFormatter={formatShort} width={60} />
          <Tooltip
            formatter={(val, name) => [formatShort(Number(val)), name]}
            labelFormatter={(label) => `Дата: ${label}`}
          />
          {/* inflows - зелёная линия */}
          <Line type="monotone" dataKey="inflows" stroke="#2ca02c" dot={false} strokeWidth={2} />
          {/* outflows - красная линия */}
          <Line type="monotone" dataKey="outflows" stroke="#d62728" dot={false} strokeWidth={2} />
          {/* netflows - синяя линия */}
          <Line type="monotone" dataKey="netflows" stroke="#1f77b4" dot={false} strokeWidth={2} />
        </RLineChart>
      </ResponsiveContainer>

      {(noMapping || empty) && (
        <div
          style={{
            position: "relative",
            marginTop: -height + 34,
            height: height - 34,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            color: "#999",
          }}
        >
          {noMapping ? "нет в справочнике" : "нет данных"}
        </div>
      )}
    </div>
  );
}

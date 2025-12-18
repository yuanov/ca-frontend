import React, { useState } from "react";
import CoinInfoChart from "../components/CoinInfoChart.jsx";
import TokenPicker from "../components/TokenPicker.jsx";
import TokenFlowsChart from "../components/TokenFlowsChart.jsx";
import { getInitialCoinId } from "../components/coinSelection.js";

export default function Home({ navigate }) {
  const [coinId, setCoinId] = useState(() => getInitialCoinId(22691));
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <TokenPicker
          value={coinId}
          onChange={(v) => setCoinId(v)}
          label="ID монеты:"
          applyButtonLabel="Показать"
        />
        <span className="caption" style={{ marginLeft: 8 }}>
          Данные с локального сервера (localhost:3000)
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => navigate && navigate("details")}
          style={{ padding: "6px 10px", cursor: "pointer" }}
        >
            Перейти на страницу Volume
        </button>
        <button
          onClick={() => navigate && navigate("mcap")}
          style={{ padding: "6px 10px", cursor: "pointer" }}
        >
          Перейти на страницу MCAP
        </button>
        <button
          onClick={() => navigate && navigate("token-turnover")}
          style={{ padding: "6px 10px", cursor: "pointer" }}
        >
          Перейти на страницу Token Turnover
        </button>
      </div>
      {/* Увеличиваем высоту графиков метрик на 1.5x от прежней (800 → 1200) */}
      <CoinInfoChart id={coinId} height={1200} />
      <div style={{ height: 24 }} />
      {/* График потоков токена: inflows / outflows / netflows */}
      <TokenFlowsChart coinId={coinId} height={480} count={60} />
    </div>
  );
}

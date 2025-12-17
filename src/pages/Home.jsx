import React, { useState } from "react";
import CoinInfoChart from "../components/CoinInfoChart.jsx";

export default function Home({ navigate }) {
  const [pendingId, setPendingId] = useState("22691");
  const [coinId, setCoinId] = useState(22691);
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
        <label htmlFor="coin-id-input">ID монеты:</label>
        <input
          id="coin-id-input"
          type="number"
          value={pendingId}
          onChange={(e) => setPendingId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = Number(pendingId);
              if (!Number.isNaN(v) && v > 0) setCoinId(v);
            }
          }}
          style={{ width: 140, padding: "6px 8px" }}
        />
        <button
          onClick={() => {
            const v = Number(pendingId);
            if (!Number.isNaN(v) && v > 0) setCoinId(v);
          }}
          style={{ padding: "6px 10px", cursor: "pointer" }}
        >
          Показать
        </button>
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
    </div>
  );
}

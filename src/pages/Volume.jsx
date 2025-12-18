import React, { useState } from "react";
import VolumeIndicatorChart from "../components/VolumeIndicatorChart.jsx";
import SignalsChart from "../components/SignalsChart.jsx";
import TokenPicker from "../components/TokenPicker.jsx";
import { getInitialCoinId } from "../components/coinSelection.js";

export default function Volume({ navigate }) {
  const [indicatorId, setIndicatorId] = useState(() => getInitialCoinId(22691));
  return (
    <div style={{ padding: 16 }}>
      <div
        style={{
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <button
          onClick={() => navigate("home")}
          style={{ padding: "6px 10px", cursor: "pointer" }}
        >
          ← Назад на главную
        </button>
        <div style={{ flex: 1 }} />
        <TokenPicker
          value={indicatorId}
          onChange={(v) => setIndicatorId(v)}
          label="ID индикатора:"
          applyButtonLabel="Показать"
        />
        <span className="caption" style={{ marginLeft: 8 }}>
          Данные с локального сервера (localhost:3000/indicators)
        </span>
      </div>
      <h2 style={{ margin: "8px 0" }}>Индикаторы</h2>
      <VolumeIndicatorChart id={indicatorId} />

      <h2 style={{ margin: "16px 0 8px" }}>Сигналы</h2>
      <SignalsChart id={indicatorId} metric="volume" height={440} enableZoom={true} />
    </div>
  );
}

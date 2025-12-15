import React, { useState } from "react";
import VolumeIndicatorChart from "../components/VolumeIndicatorChart.jsx";
import SignalsChart from "../components/SignalsChart.jsx";

export default function Volume({ navigate }) {
  const [pendingId, setPendingId] = useState("22691");
  const [indicatorId, setIndicatorId] = useState(22691);
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
        <label htmlFor="indicator-id-input">ID индикатора:</label>
        <input
          id="indicator-id-input"
          type="number"
          value={pendingId}
          onChange={(e) => setPendingId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const v = Number(pendingId);
              if (!Number.isNaN(v) && v > 0) setIndicatorId(v);
            }
          }}
          style={{ width: 140, padding: "6px 8px" }}
        />
        <button
          onClick={() => {
            const v = Number(pendingId);
            if (!Number.isNaN(v) && v > 0) setIndicatorId(v);
          }}
          style={{ padding: "6px 10px", cursor: "pointer" }}
        >
          Показать
        </button>
        <span className="caption" style={{ marginLeft: 8 }}>
          Данные с локального сервера (localhost:3000/indicators)
        </span>
      </div>
      <h2 style={{ margin: "8px 0" }}>Индикаторы</h2>
      <VolumeIndicatorChart id={indicatorId} />

      <h2 style={{ margin: "16px 0 8px" }}>Сигналы</h2>
      <SignalsChart id={indicatorId} metric="volume" height={400} />
    </div>
  );
}

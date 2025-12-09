import React from "react";

export default function Details({ navigate }) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <button onClick={() => navigate("home")} style={{ padding: "6px 10px", cursor: "pointer" }}>
          ← Назад на главную
        </button>
      </div>
      <h2 style={{ margin: "8px 0" }}>Отдельная страница</h2>
      <p className="caption">Здесь можно разместить дополнительный контент.</p>
    </div>
  );
}

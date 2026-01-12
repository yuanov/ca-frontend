import React, { useEffect, useState } from "react";

const metrics = [
  { key: "volume", label: "Volume" },
  { key: "token-turnover", label: "Token Turnover" },
  { key: "mcap", label: "MCAP" },
];

const SIGNAL_CONFIG = [
  { key: "ema7AboveEma21", label: "EMA7 > EMA21" },
  { key: "ema21_gt_ema50", label: "EMA21 > EMA50", mcapKey: "ema21AboveEma50" },
  { key: "volumeAboveEma21", label: "> EMA21", mcapKey: "mcapAboveEma21", turnoverKey: "turnoverAboveEma21" },
  { key: "roc14Above30", label: "ROC14 > 30" },
  { key: "roc21_gt_0", label: "ROC21 > 0", mcapKey: "roc21Above0" },
  { key: "zscore14Above2", label: "ZSCORE14 > 2" },
  { key: "bb.isUpperBroken", label: "> upper BB" },
  { key: "bb.isBandWidthIncreasing", label: "BB width up" },
  { key: "sr.isResistanceBroken", label: "> resistance" },
];

export default function SignalsTable({ coinId }) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSignals = async () => {
      setLoading(true);
      setError(null);
      try {
        const count = 180;
        const q = `?count=${encodeURIComponent(count)}`;
        
        // Получаем данные сигналов для всех метрик параллельно
        const results = await Promise.all(
          metrics.map(async (m) => {
            const signalsUrl = `http://localhost:3000/signals/${m.key}/${coinId}${q}`;
            const resp = await fetch(signalsUrl);
            if (!resp.ok) throw new Error(`Failed to fetch ${m.key} signals`);
            return { key: m.key, data: await resp.json() };
          })
        );

        const newData = {};

        results.forEach((res) => {
          const sigObj = res.data;
          const signalsForMetric = {};
          const isMcap = res.key === "mcap";
          const isTurnover = res.key === "token-turnover";
          
          SIGNAL_CONFIG.forEach((conf) => {
            let apiKey = conf.key;
            if (isMcap && conf.mcapKey) apiKey = conf.mcapKey;
            else if (isTurnover && conf.turnoverKey) apiKey = conf.turnoverKey;

            // Извлекаем значение (поддержка вложенных ключей типа bb.isUpperBroken)
            let arr;
            if (apiKey.includes(".")) {
              const [parent, child] = apiKey.split(".");
              arr = sigObj[parent]?.[child];
            } else {
              arr = sigObj[apiKey];
            }
            
            const lastVal = Array.isArray(arr) ? arr[arr.length - 1] : false;
            signalsForMetric[conf.key] = lastVal === true;
          });
          newData[res.key] = signalsForMetric;
        });

        setData(newData);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    if (coinId) {
      fetchSignals();
    }
  }, [coinId]);

  if (loading) return <div>Загрузка таблицы сигналов...</div>;
  if (error) return <div style={{ color: "red" }}>Ошибка: {error}</div>;

  return (
    <div style={{ marginTop: 24, overflowX: "auto" }}>
      <h3 style={{ fontSize: 16, marginBottom: 12 }}>Статус сигналов (последнее значение)</h3>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ backgroundColor: "#f8fafc" }}>
            <th style={cellStyle}>Метрика</th>
            {SIGNAL_CONFIG.map((conf) => (
              <th key={conf.key} style={cellStyle}>
                {conf.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => (
            <tr key={m.key}>
              <td style={{ ...cellStyle, fontWeight: "bold" }}>{m.label}</td>
              {SIGNAL_CONFIG.map((conf) => {
                const isVolume = m.key === "volume";
                const isMcap = m.key === "mcap";
                const val = data[m.key]?.[conf.key];
                
                // Колонки без данных для всех кроме MCAP
                const isNoDataColumn = !isMcap && (conf.key === "ema21_gt_ema50" || conf.key === "roc21_gt_0");
                
                // Для MCAP разрешены только эти колонки
                const isAllowedMcapColumn = isMcap && (
                  conf.key === "volumeAboveEma21" || 
                  conf.key === "ema21_gt_ema50" || 
                  conf.key === "roc21_gt_0" ||
                  conf.key === "bb.isUpperBroken" ||
                  conf.key === "bb.isBandWidthIncreasing" ||
                  conf.key === "sr.isResistanceBroken"
                );

                return (
                  <td key={conf.key} style={{ ...cellStyle, textAlign: "center" }}>
                    {isMcap ? (
                      isAllowedMcapColumn ? (
                        val ? (
                          <span style={{ color: "#22c55e", fontWeight: "bold" }}>✓</span>
                        ) : (
                          <span style={{ color: "#ef4444", fontWeight: "bold" }}>✗</span>
                        )
                      ) : (
                        <span style={{ color: "#cbd5e1" }}>—</span>
                      )
                    ) : isNoDataColumn ? (
                      <span style={{ color: "#cbd5e1" }}>—</span>
                    ) : (isVolume || m.key === "token-turnover") ? (
                      val ? (
                        <span style={{ color: "#22c55e", fontWeight: "bold" }}>✓</span>
                      ) : (
                        <span style={{ color: "#ef4444", fontWeight: "bold" }}>✗</span>
                      )
                    ) : val ? (
                      <span style={{ color: "#22c55e", fontWeight: "bold" }}>✓</span>
                    ) : (
                      <span style={{ color: "#cbd5e1" }}>—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const cellStyle = {
  border: "1px solid #e2e8f0",
  padding: "8px 12px",
  textAlign: "left",
};

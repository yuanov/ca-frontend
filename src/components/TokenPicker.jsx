import React, { useEffect, useMemo, useState } from "react";
import { PRESET_TOKENS, saveCoinId } from "./coinSelection.js";

/**
 * Универсальный компонент выбора токена/индикатора:
 * - инпут числа,
 * - кнопки пресетов,
 * - кнопка подтверждения (опционально, по Enter тоже применяется).
 *
 * Props:
 * - value: number — текущее выбранное значение (контролируется родителем)
 * - onChange: (num) => void — вызывается при применении нового значения
 * - label: string — подпись к инпуту
 * - applyButtonLabel: string — текст кнопки подтверждения
 */
export default function TokenPicker({
  value,
  onChange,
  label = "ID:",
  applyButtonLabel = "Показать",
}) {
  const [pending, setPending] = useState(() => String(value ?? ""));

  // Синхронизируем pending, если внешнее значение изменилось
  useEffect(() => {
    setPending(String(value ?? ""));
  }, [value]);

  const apply = useMemo(
    () => () => {
      const v = Number(pending);
      if (!Number.isNaN(v) && v > 0) {
        saveCoinId(v);
        onChange && onChange(v);
      }
    },
    [pending, onChange]
  );

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <label htmlFor="token-picker-input">{label}</label>
      <input
        id="token-picker-input"
        type="number"
        value={pending}
        onChange={(e) => setPending(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") apply();
        }}
        style={{ width: 140, padding: "6px 8px" }}
      />

      {/* Пресеты ID токенов для быстрого выбора */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
        <span className="caption" style={{ marginLeft: 4, marginRight: 4 }}>
          Быстрый выбор:
        </span>
        {PRESET_TOKENS.map((p) => (
          <button
            key={p.id}
            onClick={() => {
              saveCoinId(p.id);
              setPending(String(p.id));
              onChange && onChange(p.id);
            }}
            title={`${p.id}`}
            style={{ padding: "4px 8px", cursor: "pointer" }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <button onClick={apply} style={{ padding: "6px 10px", cursor: "pointer" }}>
        {applyButtonLabel}
      </button>
    </div>
  );
}

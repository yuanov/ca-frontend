import React from 'react';
import CoinInfoChart from '../components/CoinInfoChart.jsx';

export default function Home() {
  return (
    <div>
      <p className="caption">Данные загружаются с локального сервера (localhost:3000)</p>
      <CoinInfoChart/>
    </div>
  );
}

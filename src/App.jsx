import React, { useState } from "react";
import Home from "./pages/Home.jsx";
import Details from "./pages/Details.jsx";
import Mcap from "./pages/Mcap.jsx";
import TokenTurnover from "./pages/TokenTurnover.jsx";

export default function App() {
  const [route, setRoute] = useState("home");

  const navigate = (to) => {
    setRoute(to);
  };

  if (route === "details") {
    return <Details navigate={navigate} />;
  }
  if (route === "mcap") {
    return <Mcap navigate={navigate} />;
  }
  if (route === "token-turnover") {
    return <TokenTurnover navigate={navigate} />;
  }
  return <Home navigate={navigate} />;
}

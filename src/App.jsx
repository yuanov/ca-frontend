import React, { useState } from "react";
import Home from "./pages/Home.jsx";
import Details from "./pages/Details.jsx";

export default function App() {
  const [route, setRoute] = useState("home");

  const navigate = (to) => {
    setRoute(to);
  };

  if (route === "details") {
    return <Details navigate={navigate} />;
  }
  return <Home navigate={navigate} />;
}

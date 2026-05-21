import React from "react";
import ReactDOM from "react-dom/client";
import SettingsPage from "./components/SettingsPage";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <SettingsPage />
  </React.StrictMode>
);


  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import DebugEngagementPage from "./app/DebugEngagementPage.tsx";
  import "./styles/index.css";

  const isDebug = window.location.pathname === "/debug";
  createRoot(document.getElementById("root")!).render(isDebug ? <DebugEngagementPage /> : <App />);
  
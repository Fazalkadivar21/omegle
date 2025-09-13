import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { Route, Routes, BrowserRouter } from "react-router"
import Chat from "./components/Chat"
import Vc from "./components/Vc"


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/vc" element={<Vc />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);

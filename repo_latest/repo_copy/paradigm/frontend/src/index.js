import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";

// Suppress R3F reconciler warnings in dev mode error overlay
if (process.env.NODE_ENV === 'development') {
  const origError = console.error;
  console.error = (...args) => {
    if (typeof args[0] === 'string' && (args[0].includes('R3F') || args[0].includes('line-number'))) return;
    origError.apply(console, args);
  };
  // Suppress the react-error-overlay for R3F errors
  window.addEventListener('error', (e) => {
    if (e.message?.includes?.('line-number') || e.message?.includes?.('R3F')) {
      e.stopImmediatePropagation();
    }
  });
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <App />
);

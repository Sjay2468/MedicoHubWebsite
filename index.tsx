import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

console.log("🚀 Medico Hub: Starting index.tsx");

const container = document.getElementById('root');
if (!container) {
  console.error("❌ Medico Hub: Could not find root element!");
  throw new Error("Could not find root element to mount to");
}

console.log("📦 Medico Hub: Creating React root...");
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
console.log("✅ Medico Hub: Render command sent.");
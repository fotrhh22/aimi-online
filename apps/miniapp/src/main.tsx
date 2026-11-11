import React from "react";
import { createRoot } from "react-dom/client";
import { installScaleLock } from "./lib/scale-lock";
import { installSafeArea } from "./lib/safe-area";
import { App } from "./app/App";
import "./tokens.css";
import "./styles.css";
import "./layout.css";
const cleanupSafeArea = installSafeArea();
const cleanupScaleLock = installScaleLock();
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    cleanupSafeArea();
    cleanupScaleLock();
  });
// A new document starts a new AI visit; never restore old drafts/results.
for (const key of Object.keys(sessionStorage))
  if (/^aimi\.(optimizer|recommendation|model)\./.test(key))
    sessionStorage.removeItem(key);
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

import React from "react";
import "./popup.css";
import { useChromeStorage } from "./hooks/useChromeStorage";
import ThemeSettings from "./components/ThemeSettings";
import AnticheatSettings from "./components/AnticheatSettings";
import AvoidListSettings from "./components/AvoidListSettings";
import UpdaterSettings from "./components/UpdaterSettings";
import logo from "../../icons/icon48.png";

export default function Popup() {
  const [autoReady, setAutoReady] = useChromeStorage("autoReady", false);
  const [streamerMode, setStreamerMode] = useChromeStorage(
    "streamerMode",
    false,
  );
  const [customTheme, setCustomTheme] = useChromeStorage("customTheme", false);

  return (
    <div className="container">
      <div className="header">
        <img src={logo} alt="Logo" className="logo" />
        <div className="title">L4D2 Center Enhanced</div>
      </div>

      <div className="section-header">Features</div>
      <div className="settings-list">
        <div className="setting-item">
          <div>
            <div className="setting-label">Auto Ready</div>
            <div className="setting-desc">
              Automatically clicks "Ready" in lobby
            </div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={autoReady}
              onChange={(e) => setAutoReady(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div>
            <div className="setting-label">Streamer Mode</div>
            <div className="setting-desc">Hides party codes</div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={streamerMode}
              onChange={(e) => setStreamerMode(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div>
            <div className="setting-label">Custom Theme</div>
            <div className="setting-desc">Apply custom colors to page</div>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={customTheme}
              onChange={(e) => setCustomTheme(e.target.checked)}
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <ThemeSettings />
      <AnticheatSettings />
      <AvoidListSettings />
      <UpdaterSettings />
    </div>
  );
}

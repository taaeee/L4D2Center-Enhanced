import React, { useState } from "react";
import "./popup.css";
import { useChromeStorage } from "./hooks/useChromeStorage";
import ThemeSettings from "./components/ThemeSettings";
import AnticheatSettings from "./components/AnticheatSettings";
import AvoidListSettings from "./components/AvoidListSettings";
import UpdaterSettings from "./components/UpdaterSettings";
import logo from "../../icons/icon48.png";

export default function Popup() {
  const [copied, setCopied] = useState(false);
  const extId = chrome?.runtime?.id || "development";

  const handleCopyId = () => {
    navigator.clipboard.writeText(extId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

      <div className="section-header">Info</div>
      <div className="settings-list mb-4">
        <div 
          className="setting-item cursor-pointer" 
          onClick={handleCopyId}
          title="Copy Extension ID"
        >
          <div>
            <div className="setting-label">Extension ID</div>
            <div className="setting-desc font-mono">
              {extId}
            </div>
          </div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${copied ? 'bg-[rgba(168,199,250,0.15)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.08)]'}`}>
            {copied ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            )}
          </div>
        </div>
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

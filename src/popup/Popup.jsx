import React, { useState } from "react";
import "./popup.css";
import { useChromeStorage } from "./hooks/useChromeStorage";
import { useTranslation } from "./i18n";
import ThemeSettings from "./components/ThemeSettings";
import AnticheatSettings from "./components/AnticheatSettings";
import AvoidListSettings from "./components/AvoidListSettings";
import UpdaterSettings from "./components/UpdaterSettings";
import OBSSettings from "./components/OBSSettings";
import logo from "../../icons/icon48.png";

export default function Popup() {
  const { t, lang, setLang } = useTranslation();
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
      <div className="header justify-between">
        <div className="flex items-center">
          <img src={logo} alt="Logo" className="logo" />
          <div className="title">L4D2 Center Enhanced</div>
        </div>
        <div className="flex items-center bg-[var(--card-bg)] rounded-full p-1 border border-[#44474f] ml-auto gap-0.5 shadow-sm">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)] ml-1.5 mr-0.5">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <button
            onClick={() => setLang("es")}
            className={`px-2.5 py-1 text-[11px] font-bold tracking-wider rounded-full transition-all duration-200 cursor-pointer border-0 select-none ${
              lang === "es"
                ? "bg-[var(--accent)] text-[#062e6f] shadow-sm scale-102"
                : "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.06)]"
            }`}
          >
            ES
          </button>
          <button
            onClick={() => setLang("en")}
            className={`px-2.5 py-1 text-[11px] font-bold tracking-wider rounded-full transition-all duration-200 cursor-pointer border-0 select-none ${
              lang === "en"
                ? "bg-[var(--accent)] text-[#062e6f] shadow-sm scale-102"
                : "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[rgba(255,255,255,0.06)]"
            }`}
          >
            EN
          </button>
        </div>
      </div>

      <div className="section-header">{t("info")}</div>
      <div className="settings-list mb-4">
        <div 
          className="setting-item cursor-pointer" 
          onClick={handleCopyId}
          title={t("copyExtensionId")}
        >
          <div>
            <div className="setting-label">{t("extensionId")}</div>
            <div className="setting-desc font-mono">
              {extId}
            </div>
          </div>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors ${copied ? 'bg-[rgba(168,199,250,0.15)] text-(--accent)' : 'text-(--text-secondary) hover:bg-[rgba(255,255,255,0.08)]'}`}>
            {copied ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            )}
          </div>
        </div>
      </div>

      <div className="section-header">{t("features")}</div>
      <div className="settings-list">
        <div className="setting-item">
          <div>
            <div className="setting-label">{t("autoReady")}</div>
            <div className="setting-desc">
              {t("autoReadyDesc")}
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
            <div className="setting-label">{t("streamerMode")}</div>
            <div className="setting-desc">{t("streamerModeDesc")}</div>
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
            <div className="setting-label">{t("customTheme")}</div>
            <div className="setting-desc">{t("customThemeDesc")}</div>
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
      <OBSSettings />
      <AnticheatSettings />
      <AvoidListSettings />
      <UpdaterSettings />
    </div>
  );
}

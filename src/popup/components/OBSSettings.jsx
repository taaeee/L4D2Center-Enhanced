import React, { useState, useEffect } from "react";
import { useTranslation } from "../i18n";

export default function OBSSettings() {
  const { t } = useTranslation();
  const [obsToken, setObsToken] = useState("");
  const [userSteamId, setUserSteamId] = useState("");
  const [copiedPartida, setCopiedPartida] = useState(false);
  const [copiedMmr, setCopiedMmr] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(["obsToken", "userSteamId"], (result) => {
      if (result.obsToken) {
        setObsToken(result.obsToken);
      } else {
        const newToken = crypto.randomUUID();
        chrome.storage.local.set({ obsToken: newToken });
        setObsToken(newToken);
      }
      if (result.userSteamId) {
        setUserSteamId(result.userSteamId);
      }
    });
  }, []);

  const getUrl = (panelType) => {
    if (!obsToken) return "";
    const sbu = btoa("https://vctxtgacwuprmivvgclw.supabase.co");
    const sbk = btoa("sb_publishable_x6a3UfdTi8NpEyqFqhL31A_ZS5RCjfg");

    if (panelType === "mmr") {
      return `https://taaeee.github.io/obs_mmr_overlay?token=${obsToken}&u=${sbu}&k=${sbk}${userSteamId ? `&s=${userSteamId}` : ""}`;
    } else {
      return `https://taaeee.github.io/?token=${obsToken}&u=${sbu}&k=${sbk}`;
    }
  };

  const handleCopy = (panelType) => {
    const url = getUrl(panelType);
    if (!url) return;

    navigator.clipboard.writeText(url);
    if (panelType === "partida") {
      setCopiedPartida(true);
      setTimeout(() => setCopiedPartida(false), 2000);
    } else {
      setCopiedMmr(true);
      setTimeout(() => setCopiedMmr(false), 2000);
    }
  };

  const handleRegenerate = () => {
    if (confirm(t("regenConfirm"))) {
      const newToken = crypto.randomUUID();
      chrome.storage.local.set({ obsToken: newToken });
      setObsToken(newToken);
      setCopiedPartida(false);
      setCopiedMmr(false);
    }
  };

  return (
    <>
      <div className="section-header mt-4 mb-2 pr-2">
        <span>{t("obsOverlay")}</span>
      </div>

      <div className="settings-list mb-4">
        {/* Panel Partida */}
        <div
          className="setting-item cursor-pointer"
          onClick={() => handleCopy("partida")}
          title={t("copyPanelPartida")}
        >
          <div className="flex-1 min-w-0 pr-4">
            <div className="setting-label">{t("panelPartida")}</div>
          </div>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors shrink-0 ${copiedPartida ? "bg-[rgba(168,199,250,0.15)] text-(--accent)" : "text-(--text-secondary) hover:bg-[rgba(255,255,255,0.08)]"}`}
          >
            {copiedPartida ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            )}
          </div>
        </div>

        {/* Panel MMR */}
        <div
          className="setting-item cursor-pointer"
          onClick={() => handleCopy("mmr")}
          title={t("copyPanelMmr")}
        >
          <div className="flex-1 min-w-0 pr-4">
            <div className="setting-label">{t("panelMmr")}</div>
          </div>
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-colors shrink-0 ${copiedMmr ? "bg-[rgba(168,199,250,0.15)] text-(--accent)" : "text-(--text-secondary) hover:bg-[rgba(255,255,255,0.08)]"}`}
          >
            {copiedMmr ? (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ) : (
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '24px', marginBottom: '16px' }}>
        <div
          className="setting-item cursor-pointer"
          style={{ width: '50%', padding: '10px 14px' }}
          onClick={handleRegenerate}
          title={t("regenTokenTitle")}
        >
          <div className="flex-1 min-w-0 flex justify-center">
            <div className="setting-label" style={{ color: '#f87171', textAlign: 'center', fontSize: '13px' }}>{t("regenToken")}</div>
          </div>
          <div className="flex items-center justify-center rounded-full transition-colors shrink-0 ml-1" style={{ width: '28px', height: '28px', color: '#f87171' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.28l5.67-1.41" />
            </svg>
          </div>
        </div>
      </div>
    </>
  );
}


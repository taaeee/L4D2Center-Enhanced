import React, { useEffect, useState } from 'react';
import manifest from '../../../manifest.json';
import { useTranslation } from '../i18n';

export default function UpdaterSettings() {
  const { t } = useTranslation();
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateVersion, setUpdateVersion] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');
  const [updateUrl, setUpdateUrl] = useState('');
  const [statusKey, setStatusKey] = useState('');

  useEffect(() => {
    // Check if background already found an update
    chrome.storage.local.get(['updateAvailable', 'updateVersion', 'updateNotes', 'updateUrl'], (res) => {
      if (res.updateAvailable) {
        setUpdateAvailable(true);
        setUpdateVersion(res.updateVersion);
        setUpdateNotes(res.updateNotes);
        setUpdateUrl(res.updateUrl);
      }
    });
  }, []);

  const handleCheckUpdate = () => {
    setChecking(true);
    setStatusKey('checking');
    chrome.runtime.sendMessage({ type: 'checkForUpdate' }, (res) => {
      setChecking(false);
      if (res && res.hasUpdate) {
        setUpdateAvailable(true);
        setUpdateVersion(res.version);
        // We fetch notes and url which were just saved by the background script
        chrome.storage.local.get(['updateNotes', 'updateUrl'], (stored) => {
          setUpdateNotes(stored.updateNotes);
          setUpdateUrl(stored.updateUrl);
        });
        setStatusKey('updateFound');
      } else {
        setStatusKey('latestVersion');
        setTimeout(() => setStatusKey(''), 3000);
      }
    });
  };

  return (
    <>
      {updateAvailable && (
        <div className="update-banner visible">
          <div className="update-banner-title">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
            </svg>
            {t("updateAvailable")}
          </div>
          <div className="update-banner-version">{t("version")}{updateVersion}</div>
          <div className="update-banner-notes">{updateNotes}</div>
          <a href={updateUrl} target="_blank" rel="noopener noreferrer" className="update-download-btn" style={{ textDecoration: 'none' }}>
            {t("downloadUpdate")}
          </a>
        </div>
      )}
      
      <div className="footer" style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
        <div style={{ marginBottom: '8px' }}>v{manifest.version}</div>
        <button className="check-update-btn" onClick={handleCheckUpdate} disabled={checking}>
          {checking ? t("checking") : statusKey ? t(statusKey) : t("checkUpdates")}
        </button>
      </div>
    </>
  );
}


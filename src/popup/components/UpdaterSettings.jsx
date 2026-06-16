import React, { useEffect, useState } from 'react';
import manifest from '../../../manifest.json';

export default function UpdaterSettings() {
  const [checking, setChecking] = useState(false);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateVersion, setUpdateVersion] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');
  const [updateUrl, setUpdateUrl] = useState('');
  const [statusText, setStatusText] = useState('');

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
    setStatusText('Checking...');
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
        setStatusText('Update found!');
      } else {
        setStatusText('You have the latest version.');
        setTimeout(() => setStatusText(''), 3000);
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
            Update Available!
          </div>
          <div className="update-banner-version">Version {updateVersion}</div>
          <div className="update-banner-notes">{updateNotes}</div>
          <a href={updateUrl} target="_blank" rel="noopener noreferrer" className="update-download-btn" style={{ textDecoration: 'none' }}>
            Download Update
          </a>
        </div>
      )}
      
      <div className="footer" style={{ marginTop: '24px', textAlign: 'center', fontSize: '11px', color: 'var(--text-secondary)' }}>
        <div style={{ marginBottom: '8px' }}>v{manifest.version}</div>
        <button className="check-update-btn" onClick={handleCheckUpdate} disabled={checking}>
          {checking ? 'Checking...' : statusText || 'Check for updates'}
        </button>
      </div>
    </>
  );
}

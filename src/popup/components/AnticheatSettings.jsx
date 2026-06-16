import React from 'react';
import { useChromeStorage } from '../hooks/useChromeStorage';

export default function AnticheatSettings() {
  const [anticheatPath, setAnticheatPath] = useChromeStorage('anticheatPath', '');
  const [statusMsg, setStatusMsg] = React.useState({ text: '', type: '' });

  const handleBrowse = () => {
    chrome.runtime.sendMessage({ type: 'browseAnticheat' }, (response) => {
      if (chrome.runtime.lastError) {
        setStatusMsg({ text: 'Error connecting to background script.', type: 'error' });
      } else if (response && response.success && response.path) {
        setAnticheatPath(response.path);
        setStatusMsg({ text: 'Path saved successfully!', type: 'success' });
      } else if (response && response.error) {
        setStatusMsg({ text: 'Error: ' + response.error, type: 'error' });
      } else {
        setStatusMsg({ text: 'No path selected.', type: 'error' });
      }
      setTimeout(() => setStatusMsg({ text: '', type: '' }), 3000);
    });
  };

  return (
    <>
      <div className="section-header">Anticheat</div>
      <div className="settings-list">
        <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="setting-label">Anticheat Path (.exe)</div>
          <div className="path-input-group">
            <input 
              type="text" 
              className="path-input"
              readOnly 
              value={anticheatPath || ''} 
              placeholder="C:\path\to\l4d2c_anticheat.exe"
            />
            <button 
              className="path-browse-btn"
              title="Browse for .exe"
              onClick={handleBrowse}
            >
              📁
            </button>
            <button className="path-save-btn">Save</button>
          </div>
          {statusMsg.text && (
            <div className="path-status" style={{ color: statusMsg.type === 'error' ? '#ff6b6b' : '#a8dab5' }}>
              {statusMsg.text}
            </div>
          )}
          <div className="setup-note">
            Run <strong>native_host/install_host.bat</strong> once to enable launch.
          </div>
        </div>
      </div>
    </>
  );
}

import React from 'react';
import { useChromeStorage } from '../hooks/useChromeStorage';

export default function AvoidListSettings() {
  const [avoidList, setAvoidList] = useChromeStorage('avoidList', {});
  
  const handleRemove = (steamId) => {
    const newList = { ...avoidList };
    delete newList[steamId];
    setAvoidList(newList);
  };

  const players = Object.keys(avoidList || {});

  return (
    <>
      <div className="section-header">Avoid List</div>
      <div className="settings-list">
        <div className="setting-item" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
          <div className="avoid-list-container">
            {players.length === 0 ? (
              <div className="avoid-empty">No players in avoid list.</div>
            ) : (
              players.map(steamId => (
                <div key={steamId} className="avoid-item">
                  <div className="avoid-item__info">
                    <div className="avoid-item__name" title={avoidList[steamId].name || steamId}>
                      {avoidList[steamId].name || steamId}
                    </div>
                    <div className="avoid-item__steamid">{steamId}</div>
                  </div>
                  <button 
                    className="avoid-item__remove"
                    title="Remove"
                    onClick={() => handleRemove(steamId)}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}

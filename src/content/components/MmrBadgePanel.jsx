import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDOMElement } from '../hooks/useDOMElement';

export default function MmrBadgePanel() {
  // Mount inside personal__right or any other suitable container
  const container = useDOMElement('.personal__right');
  const [mmr, setMmr] = useState('---');

  useEffect(() => {
    const extractMmr = () => {
      // Find the existing MMR element in the personal panel
      const mmrEl = document.querySelector('.personal [class*="mmr"], .personal-card [class*="mmr"]');
      if (mmrEl) {
        const text = mmrEl.textContent.trim();
        const numMatch = text.match(/\d+/);
        if (numMatch && numMatch[0] !== mmr) {
          setMmr(numMatch[0]);
        }
      }
    };

    extractMmr();
    const observer = new MutationObserver(extractMmr);
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }
    return () => observer.disconnect();
  }, [mmr]);

  if (!container) return null;

  return createPortal(
    <div className="flex justify-center items-center my-3 w-full">
      <div 
        className="relative flex items-center justify-center font-bold text-white text-2xl drop-shadow-lg"
        style={{
          width: '140px',
          height: '44px',
          background: 'linear-gradient(to right, #3f4c6b 0%, #d5447a 50%, #ea4b7c 50%, #ff5588 100%)',
          clipPath: 'polygon(0 15%, 50% 0, 100% 15%, 100% 85%, 50% 100%, 0 85%)',
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))'
        }}
      >
        <span 
          className="relative z-10 tracking-widest"
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
        >
          {mmr}
        </span>
      </div>
    </div>,
    container
  );
}

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDOMElement } from '../hooks/useDOMElement';

export default function AnticheatButton() {
  const container = useDOMElement('.personal__right');
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check initial session flag
    chrome.storage.session.get(['anticheatRunning'], (res) => {
      setIsRunning(!!res.anticheatRunning);
    });

    const listener = (changes, namespace) => {
      if (namespace === 'session' && changes.anticheatRunning) {
        setIsRunning(changes.anticheatRunning.newValue);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const handleClick = () => {
    setIsLoading(true);
    chrome.runtime.sendMessage({ type: 'launchAnticheat' }, (res) => {
      if (res && res.error) {
        setIsLoading(false);
        alert('Failed to launch Anticheat: ' + res.error);
      } else {
        // Success or already running, trigger login
        triggerLogin();
      }
    });
  };

  const triggerLogin = () => {
    const responseHandler = (event) => {
      if (!event.data || event.data.type !== "L4D2_ANTICHEAT_LOGIN_RESPONSE") return;
      window.removeEventListener("message", responseHandler);

      const data = event.data;
      if (data && data.success) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = "http://localhost:51115/auth";
        form.target = "_blank";

        const input = document.createElement("input");
        input.type = "hidden";
        input.name = "key";
        input.value = data.token;

        form.appendChild(input);
        document.body.appendChild(form);
        form.submit();
        form.remove();

        chrome.storage.session.set({ anticheatRunning: true });
        setIsLoading(false);
      } else {
        setIsLoading(false);
        alert("Anticheat login failed: " + (data?.error || "Unknown"));
      }
    };

    window.addEventListener("message", responseHandler);
    window.postMessage({ type: "L4D2_ANTICHEAT_LOGIN_REQUEST" }, "*");

    setTimeout(() => {
      window.removeEventListener("message", responseHandler);
      setIsLoading(false);
    }, 8000);
  };

  if (!container) return null;

  return createPortal(
    <button 
      id="l4d2-ac-btn" 
      type="button" 
      title="Launch L4D2Center Anticheat"
      className="anticheat-panel-btn"
      disabled={isLoading || isRunning}
      onClick={handleClick}
    >
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
      </svg>
      {isRunning ? 'Anticheat Active' : isLoading ? 'Launching...' : 'Launch Anticheat'}
    </button>,
    container
  );
}

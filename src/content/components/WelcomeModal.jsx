import React, { useState, useEffect } from "react";
import ReactMarkdown from 'react-markdown';

export default function WelcomeModal() {
  const [show, setShow] = useState(false);
  const [version, setVersion] = useState("");
  const [changelog, setChangelog] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const manifest = chrome.runtime.getManifest();
      const currentVersion = manifest.version;
      setVersion(currentVersion);

      const storageKey = `hasSeenWelcome_${currentVersion}`;

      chrome.storage.local.get([storageKey], (result) => {
        if (!result[storageKey]) {
          setShow(true);
          fetchChangelog(currentVersion);
        }
      });
    } catch (e) {
      console.error("WelcomeModal Error:", e);
    }
  }, []);

  const fetchChangelog = (currentVersion) => {
    chrome.runtime.sendMessage({ type: "getChangelog" }, (response) => {
      setLoading(false);
      if (response && response.length > 0) {
        // Find the release matching current version, or fallback to the latest
        const release =
          response.find((r) => r.version === currentVersion) || response[0];
        setChangelog(release.notes);
      } else {
        setChangelog("No changelog available.");
      }
    });
  };

  const handleClose = () => {
    const storageKey = `hasSeenWelcome_${version}`;
    chrome.storage.local.set({ [storageKey]: true }, () => {
      setShow(false);
    });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-[#111318] text-[#e1e2e8] rounded-3xl w-full max-w-md p-0 overflow-hidden shadow-2xl flex flex-col max-h-[85vh] border border-[#373b43]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#373b43] flex items-center justify-between shrink-0 bg-[#1d2024]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#a8c7fa] to-[#062e6f] flex items-center justify-center shrink-0">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#fff"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold m-0 leading-tight">
                Welcome to L4D2 Center Enhanced
              </h2>
              <span className="text-sm text-[#a8c7fa] font-medium tracking-wide">
                Version {version}
              </span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-[#c4c6d0] hover:text-white transition-colors"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-[#c4c6d0] uppercase tracking-wider mb-3">
              What's New
            </h3>
            <div className="bg-[#1d2024] p-4 rounded-2xl">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-[#a8c7fa] border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="text-[13px] font-sans text-[#e1e2e8] leading-relaxed opacity-90 max-w-none [&_p]:my-1.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_li]:my-0.5 [&_h1]:text-lg [&_h1]:font-semibold [&_h1]:mt-4 [&_h1]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-4 [&_h2]:mb-2 [&_h3]:font-medium [&_h3]:mt-3 [&_h3]:mb-1 [&_a]:text-[#a8c7fa] hover:[&_a]:text-[#b4cff8] [&_a]:underline [&_strong]:text-white [&_strong]:font-semibold first:[&>*:first-child]:mt-0">
                  <ReactMarkdown>{changelog}</ReactMarkdown>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#c4c6d0] uppercase tracking-wider mb-3">
              Key Features
            </h3>
            <ul className="space-y-3 m-0 p-0 list-none">
              <li className="flex items-start gap-3 bg-[#1d2024] p-3 rounded-2xl">
                <div className="mt-0.5 text-[#a8dab5]">
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
                </div>
                <div>
                  <div className="font-medium text-[14px]">Auto Ready</div>
                  <div className="text-[12px] text-[#c4c6d0] opacity-80">
                    Automatically accepts matches when they are found.
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3 bg-[#1d2024] p-3 rounded-2xl">
                <div className="mt-0.5 text-[#d0bcff]">
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
                    <path d="M2 12h4l2-9 5 18 2-9h5"></path>
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-[14px]">
                    Anticheat Integration
                  </div>
                  <div className="text-[12px] text-[#c4c6d0] opacity-80">
                    Launch L4D2Center anticheat directly from your browser.
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3 bg-[#1d2024] p-3 rounded-2xl">
                <div className="mt-0.5 text-[#ffb4ab]">
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
                    <rect
                      x="3"
                      y="11"
                      width="18"
                      height="11"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-[14px]">Streamer Mode</div>
                  <div className="text-[12px] text-[#c4c6d0] opacity-80">
                    Hides party codes and sensitive info automatically.
                  </div>
                </div>
              </li>
              <li className="flex items-start gap-3 bg-[#1d2024] p-3 rounded-2xl">
                <div className="mt-0.5 text-[#9ecaed]">
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
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-[14px]">Custom Themes</div>
                  <div className="text-[12px] text-[#c4c6d0] opacity-80">
                    Personalize your L4D2Center experience with custom colors.
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#373b43] bg-[#1d2024] flex items-center justify-between shrink-0">
          <a
            href="https://github.com/taaeee/L4D2Center-Enhanced"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm font-medium text-[#c4c6d0] hover:text-white transition-colors"
          >
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
              <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path>
            </svg>
            Star on GitHub
          </a>
          <button
            onClick={handleClose}
            className="px-6 py-2.5 bg-[#a8c7fa] hover:bg-[#b4cff8] active:scale-95 text-[#062e6f] font-semibold rounded-full transition-all shadow-md"
          >
            Let's Go!
          </button>
        </div>
      </div>
    </div>
  );
}

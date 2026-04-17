// L4D2 Center Enhanced - Content Script

console.log("L4D2 Center Enhanced: Loaded");

// Inject interceptor.js into the MAIN world
(function injectInterceptor() {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("src/interceptor.js");
  script.onload = function () {
    console.log("L4D2 Center Enhanced: Interceptor injected into MAIN world");
    this.remove();
  };
  script.onerror = function () {
    console.error("L4D2 Center Enhanced: Failed to inject interceptor");
  };
  (document.head || document.documentElement).appendChild(script);
})();

// --- Constants ---
const LOGO_URL =
  "https://64.media.tumblr.com/e336d963d32f44524c81127ef14de93d/5142b4296095f390-ce/s540x810/5f2d9b54071b7a48f735ff685a9d2ca2f8bdb895.pnj";
const FAVICON_URL =
  "https://64.media.tumblr.com/49123a4f55029539164466aeefa3d458/e331e3b5efa1e6df-f4/s250x400/07afb4f44a6cf0776616f864ee28ea8548e4496a.pnj";
const READY_CHECK_INTERVAL = 1000;

// --- State ---
let isAutoReadyEnabled = false;
let autoReadyIntervalId = null;

// --- Initialization ---
function init() {
  // Load settings from storage
  chrome.storage.local.get(
    ["autoReady", "streamerMode", "customTheme", "themeColors"],
    (result) => {
      toggleAutoReady(result.autoReady || false);
      toggleStreamerMode(result.streamerMode || false);
      toggleCustomTheme(result.customTheme || false, result.themeColors);
    }
  );

  updateFavicon();
  injectAnticheatButton();
  startDOMObserver();

  // Initialize Invitations
  if (window.L4D2Invitations) {
    setTimeout(() => {
      window.L4D2Invitations.init();

      // Check for Auto-Join URL Param
      const params = new URLSearchParams(window.location.search);
      const code = params.get("join_party");
      if (code) {
        window.L4D2Invitations.autoJoin(code);

        // Clean URL (optional, to avoid re-triggering on refresh)
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );
      }
    }, 1000);
  }

  // Initialize Match History
  if (window.L4D2MatchHistory) {
    setTimeout(() => {
      window.L4D2MatchHistory.init();
      window.L4D2MatchHistory.injectHistoryButton();
    }, 1500);
  }
}

// Listen for changes from the popup
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local") {
    if (changes.autoReady) {
      toggleAutoReady(changes.autoReady.newValue);
    }
    if (changes.streamerMode) {
      toggleStreamerMode(changes.streamerMode.newValue);
    }
    if (changes.customTheme || changes.themeColors) {
      chrome.storage.local.get(["customTheme", "themeColors"], (result) => {
        toggleCustomTheme(result.customTheme || false, result.themeColors);
      });
    }
  }
});

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "triggerLogin") {
    // Popup/background asked us to trigger the anticheat login on this page
    const btn = document.getElementById("anticheat-panel-btn") || document.getElementById("anticheat-header-btn");
    if (btn) {
      triggerAnticheatLogin(btn);
    } else {
      // No header button; create a dummy to track state and do login directly
      const dummy = document.createElement("button");
      dummy.style.display = "none";
      document.body.appendChild(dummy);
      triggerAnticheatLogin(dummy);
      setTimeout(() => dummy.remove(), 15000);
    }
    sendResponse({ success: true });
  }
  return true;
});

// --- Features ---

/* 1. Change Favicon */
function updateFavicon() {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.getElementsByTagName("head")[0].appendChild(link);
  }
  link.href = FAVICON_URL;
}

/* 2. AutoReady Logic */
function toggleAutoReady(enabled) {
  isAutoReadyEnabled = enabled;
  chrome.storage.local.set({ autoReady: enabled });

  if (enabled) {
    if (!autoReadyIntervalId) {
      autoReadyIntervalId = setInterval(
        checkAndClickReady,
        READY_CHECK_INTERVAL
      );
    }
  } else {
    if (autoReadyIntervalId) {
      clearInterval(autoReadyIntervalId);
      autoReadyIntervalId = null;
    }
  }
}

function checkAndClickReady() {
  try {
    const readyBtn = document.querySelector("#playerpanel .ready__btn");
    if (readyBtn) readyBtn.click();
  } catch (e) {}
}

function toggleStreamerMode(enabled) {
  if (enabled) {
    document.body.classList.add("streamer-mode");
  } else {
    document.body.classList.remove("streamer-mode");
  }
}

/* 4. Custom Theme */
function toggleCustomTheme(enabled, colors) {
  if (enabled && colors) {
    document.body.classList.add("custom-theme");

    // Apply CSS variables to root
    const root = document.documentElement;
    root.style.setProperty("--l4d2-bg-color", colors.bg || "#1a1a1a");
    root.style.setProperty("--l4d2-top-color", colors.top || "#2d2d2d");
    root.style.setProperty("--l4d2-text-color", colors.text || "#ffffff");
    root.style.setProperty("--l4d2-border-color", colors.border || "#3d3d3d");
    root.style.setProperty("--l4d2-accent1", colors.accent1 || "#ff9800");
    root.style.setProperty("--l4d2-accent2", colors.accent2 || "#f57c00");

    console.log("L4D2 Enhanced: Custom theme applied", colors);
  } else {
    document.body.classList.remove("custom-theme");

    // Reset CSS variables
    const root = document.documentElement;
    root.style.removeProperty("--l4d2-bg-color");
    root.style.removeProperty("--l4d2-top-color");
    root.style.removeProperty("--l4d2-text-color");
    root.style.removeProperty("--l4d2-border-color");
    root.style.removeProperty("--l4d2-accent1");
    root.style.removeProperty("--l4d2-accent2");
  }
}

/* 3. Inject Switch UI */
// function setupAutoReadyUI() { ... } // Removed in favor of Popup UI

/* Anticheat Login Button in Page Header */
const ANTICHEAT_BTN_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.12v4.7c0 4.83-3.13 9.37-7 10.5-3.87-1.13-7-5.67-7-10.5V6.3l7-3.12z"/></svg>`;

function setAnticheatBtnState(btn, text, disabled) {
  btn.disabled = disabled;
  btn.style.opacity = disabled ? "0.6" : "";
  btn.innerHTML = `${ANTICHEAT_BTN_SVG} ${text}`;
}

function injectAnticheatButton() {
  if (document.getElementById("anticheat-panel-btn")) return;

  // Only inject into the personal panel
  const panelContainer = document.querySelector(".personal__right");
  if (!panelContainer) return;

  const btn = document.createElement("button");
  btn.id = "anticheat-panel-btn";
  btn.type = "button";
  btn.title = "Launch Anticheat & Login";
  btn.className = "anticheat-panel-btn";
  setAnticheatBtnState(btn, "Anticheat", false);

  btn.addEventListener("click", () => {
    setAnticheatBtnState(btn, "Checking...", true);

    // Send to background — it will verify with a live ping before deciding
    chrome.runtime.sendMessage({ type: "launchAnticheat" }, (response) => {
      if (response && response.alreadyRunning) {
        console.log("L4D2 Enhanced: Anticheat already running (verified by background).");
        setAnticheatBtnState(btn, "✓ Already running", false);
        setTimeout(() => setAnticheatBtnState(btn, "Anticheat", false), 2000);
        return;
      }

      if (response && response.success) {
        console.log(
          "L4D2 Enhanced: Anticheat launched, waiting for startup..."
        );
        setAnticheatBtnState(btn, "Logging in...", true);
        // Wait 3s for the anticheat to start, then login
        setTimeout(() => triggerAnticheatLogin(btn), 3000);
      } else {
        console.warn(
          "L4D2 Enhanced: Launch failed (may already be running):",
          response?.error
        );
        // Still try to login — the anticheat might already be running
        setAnticheatBtnState(btn, "Logging in...", true);
        triggerAnticheatLogin(btn);
      }
    });
  });

  panelContainer.appendChild(btn);
  console.log("L4D2 Enhanced: Anticheat button injected into personal panel");
}

function triggerAnticheatLogin(btn) {
  const responseHandler = (event) => {
    if (!event.data || event.data.type !== "L4D2_ANTICHEAT_LOGIN_RESPONSE")
      return;

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

      setAnticheatBtnState(btn, "✓ Done!", false);
      console.log("L4D2 Enhanced: Anticheat login submitted with token");
      // Mark anticheat as running in session storage
      chrome.storage.session.set({ anticheatRunning: true });
      setTimeout(() => setAnticheatBtnState(btn, "Anticheat", false), 2000);
    } else {
      console.error("L4D2 Enhanced: Anticheat login failed:", data?.error);
      setAnticheatBtnState(btn, `Error: ${data?.error || "Unknown"}`, false);
      setTimeout(() => setAnticheatBtnState(btn, "Anticheat", false), 3000);
    }
  };

  window.addEventListener("message", responseHandler);
  window.postMessage({ type: "L4D2_ANTICHEAT_LOGIN_REQUEST" }, "*");

  // Timeout fallback
  setTimeout(() => {
    window.removeEventListener("message", responseHandler);
    if (btn.disabled) {
      setAnticheatBtnState(btn, "Error: Timeout", false);
      setTimeout(() => setAnticheatBtnState(btn, "Anticheat", false), 3000);
    }
  }, 8000);
}

/* 4. DOM Observer */
function startDOMObserver() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            // Element
            processNode(node);

            // Recursion
            node.querySelectorAll(".btn-grey").forEach(fixButton);
            node
              .querySelectorAll(".chat-content__lobby")
              .forEach(highlightStatus);
            node.querySelectorAll(".header__logo img").forEach(fixLogo);

            // Try to inject anticheat & history buttons when personal panel appears
            if (
              node.matches?.(".personal, .personal__right") ||
              node.querySelector?.(".personal__right")
            ) {
              injectAnticheatButton();
              if (window.L4D2MatchHistory) {
                window.L4D2MatchHistory.injectHistoryButton();
              }
            }

            // Invite Buttons
            if (window.L4D2Invitations) {
              node
                .querySelectorAll(".chat-content__item")
                .forEach((item) =>
                  window.L4D2Invitations.injectInviteButton(item)
                );
            }

            // Match History - Detect "Close Panel" button (GameResultSeenButton)
            // This button only appears when the game has ended and final data is ready
            if (window.L4D2MatchHistory) {
              const closeBtn =
                node.matches?.('a[onclick*="GameResultSeenButton"]')
                  ? node
                  : node.querySelector?.('a[onclick*="GameResultSeenButton"]');
              if (closeBtn) {
                console.log("L4D2 Enhanced: Game result Close Panel button detected — hooking capture");
                closeBtn.addEventListener("click", () => {
                  const matchPanel = document.querySelector("ingamerenderpanel");
                  if (matchPanel) {
                    console.log("L4D2 Enhanced: Capturing final match data on Close Panel click");
                    window.L4D2MatchHistory.captureMatch(matchPanel);
                  }
                });
              }

              // Fallback: also detect "Game Ended" text in case Close Panel button is missed
              if (node.textContent && node.textContent.includes("Game Ended")) {
                const matchPanel = document.querySelector("ingamerenderpanel");
                if (matchPanel && !matchPanel.dataset.l4d2HistoryCaptured) {
                  matchPanel.dataset.l4d2HistoryCaptured = "pending";
                  console.log("L4D2 Enhanced: 'Game Ended' text detected — scheduling capture");
                  // Small delay to ensure all final data has rendered
                  setTimeout(() => {
                    if (matchPanel.dataset.l4d2HistoryCaptured === "pending") {
                      matchPanel.dataset.l4d2HistoryCaptured = "done";
                      console.log("L4D2 Enhanced: Capturing final match data (Game Ended fallback)");
                      window.L4D2MatchHistory.captureMatch(matchPanel);
                    }
                  }, 2000);
                }
              }
            }
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial Pass
  document.querySelectorAll(".btn-grey").forEach(fixButton);
  document.querySelectorAll(".chat-content__lobby").forEach(highlightStatus);
  document.querySelectorAll(".header__logo img").forEach(fixLogo);

  // Check if Close Panel button already exists on page load (game already ended)
  const existingCloseBtn = document.querySelector('a[onclick*="GameResultSeenButton"]');
  if (existingCloseBtn && window.L4D2MatchHistory) {
    console.log("L4D2 Enhanced: Close Panel button found on page load — hooking capture");
    existingCloseBtn.addEventListener("click", () => {
      const matchPanel = document.querySelector("ingamerenderpanel");
      if (matchPanel) {
        console.log("L4D2 Enhanced: Capturing final match data on Close Panel click (page load)");
        window.L4D2MatchHistory.captureMatch(matchPanel);
      }
    });
  }
}

function processNode(node) {
  if (node.matches && node.matches(".btn-grey")) fixButton(node);
  if (node.matches && node.matches(".chat-content__lobby"))
    highlightStatus(node);
  if (node.matches && node.matches(".header__logo img")) fixLogo(node);

  if (
    window.L4D2Invitations &&
    node.matches &&
    node.matches(".chat-content__item")
  ) {
    window.L4D2Invitations.injectInviteButton(node);
  }
}

// -- Helpers --

function fixButton(btn) {
  btn.classList.add("btn");
  btn.classList.remove("btn-grey");
}

function highlightStatus(stat) {
  const text = stat.textContent;
  if (text.includes("In Game")) stat.classList.add("ingame");
  if (text.includes("In Queue")) stat.classList.add("inqueue");
}

function fixLogo(img) {
  if (img.src !== LOGO_URL) {
    img.src = LOGO_URL;
  }
}

// Run
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

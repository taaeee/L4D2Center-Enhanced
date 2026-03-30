// L4D2 Center Enhanced - Background Service Worker
// Handles AutoReady when the tab is in the background using chrome.alarms

const ALARM_NAME = "autoReadyAlarm";
const ALARM_PERIOD_MINUTES = 0.5; // 30 seconds (minimum for chrome.alarms)
const L4D2_URL_PATTERN = "https://l4d2center.com/*";

// --- Alarm-based AutoReady ---

// Fires when the alarm triggers
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    clickReadyOnL4D2Tabs();
  }
});

// Find all L4D2 tabs and inject the click script
async function clickReadyOnL4D2Tabs() {
  try {
    const tabs = await chrome.tabs.query({ url: L4D2_URL_PATTERN });

    for (const tab of tabs) {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const readyBtn = document.querySelector("#playerpanel .ready__btn");
            if (readyBtn) {
              readyBtn.click();
              console.log("L4D2 Enhanced [BG]: Clicked ready button");
            }
          },
        });
      } catch (err) {
        // Tab might have been closed or navigated away, ignore
        console.warn(
          "L4D2 Enhanced [BG]: Could not inject into tab",
          tab.id,
          err.message
        );
      }
    }
  } catch (err) {
    console.error("L4D2 Enhanced [BG]: Error querying tabs", err);
  }
}

// Enable/disable the alarm
async function setAutoReadyAlarm(enabled) {
  if (enabled) {
    // Create repeating alarm (first fire after 0.5 min, then every 0.5 min)
    await chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: ALARM_PERIOD_MINUTES,
      periodInMinutes: ALARM_PERIOD_MINUTES,
    });
    console.log("L4D2 Enhanced [BG]: AutoReady alarm created (every 30s)");
  } else {
    await chrome.alarms.clear(ALARM_NAME);
    console.log("L4D2 Enhanced [BG]: AutoReady alarm cleared");
  }
}

// --- Storage listeners ---

// React to autoReady toggle changes from popup/content script
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === "local" && changes.autoReady) {
    setAutoReadyAlarm(changes.autoReady.newValue);
  }
});

// --- Service Worker startup ---
// Allow content scripts to access session storage (needed for anticheat flag)
chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_AND_UNTRUSTED_CONTEXTS" });

// Re-create the alarm if autoReady was previously enabled
// (handles browser restart, SW wake-up, extension update)
chrome.storage.local.get(["autoReady"], (result) => {
  if (result.autoReady) {
    setAutoReadyAlarm(true);
  }
});

// --- Native Messaging: Launch Anticheat ---
const NATIVE_HOST_NAME = "com.l4d2center.enhanced";

// Helper: Ping localhost:51115 to check if anticheat is actually running
async function isAnticheatAlive() {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 2000);
    await fetch("http://localhost:51115", { method: "HEAD", signal: controller.signal });
    return true;
  } catch (e) {
    return false;
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "launchAnticheat") {
    (async () => {
      // Check session flag, but verify with a live ping
      const flagResult = await chrome.storage.session.get(["anticheatRunning"]);
      if (flagResult.anticheatRunning) {
        const alive = await isAnticheatAlive();
        if (alive) {
          console.log("L4D2 Enhanced [BG]: Anticheat verified running (ping OK), skipping launch.");
          sendResponse({ success: true, alreadyRunning: true });
          return;
        } else {
          console.log("L4D2 Enhanced [BG]: Anticheat flag was set but ping failed — was closed. Clearing flag.");
          await chrome.storage.session.set({ anticheatRunning: false });
        }
      }

      const localResult = await chrome.storage.local.get(["anticheatPath"]);
      const exePath = localResult.anticheatPath;

      if (!exePath) {
        sendResponse({
          success: false,
          error: "Anticheat path not configured. Set it in the extension popup.",
        });
        return;
      }

      chrome.runtime.sendNativeMessage(
        NATIVE_HOST_NAME,
        { action: "launch", path: exePath },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error(
              "L4D2 Enhanced [BG]: Native messaging error:",
              chrome.runtime.lastError.message
            );
            sendResponse({
              success: false,
              error: chrome.runtime.lastError.message,
            });
          } else {
            console.log("L4D2 Enhanced [BG]: Native host response:", response);
            // Do NOT set the flag here — only set after successful LOGIN
            sendResponse(response);
          }
        }
      );
    })();
    return true; // Keep message channel open for async response
  }

  if (message.type === "browseAnticheat") {
    chrome.runtime.sendNativeMessage(
      NATIVE_HOST_NAME,
      { action: "browse" },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "L4D2 Enhanced [BG]: Native browse error:",
            chrome.runtime.lastError.message
          );
          sendResponse({
            success: false,
            error: chrome.runtime.lastError.message,
          });
        } else {
          console.log("L4D2 Enhanced [BG]: Browse response:", response);
          sendResponse(response);
        }
      }
    );
    return true;
  }

  // --- Browser Notification for Game Invites ---
  if (message.type === "gameInvite") {
    const { displayName, lobbyLink, fromSteamId } = message;
    const notifId = `invite_${Date.now()}`;

    chrome.notifications.create(notifId, {
      type: "basic",
      iconUrl: "icons/icon128.png",
      title: "Game Invite",
      message: `${displayName} wants you to join their party!`,
      buttons: [{ title: "Join" }, { title: "Ignore" }],
      requireInteraction: true,
      priority: 2,
    });

    // Store invite data for click handling
    chrome.storage.session.set({
      [`notif_${notifId}`]: {
        lobbyLink,
        fromSteamId,
        senderTabId: sender.tab?.id,
      },
    });

    sendResponse({ success: true });
    return false;
  }
});

// --- Notification Click Handlers ---
chrome.notifications.onClicked.addListener((notifId) => {
  if (notifId.startsWith("invite_")) {
    handleInviteAccept(notifId);
  }
});

chrome.notifications.onButtonClicked.addListener((notifId, buttonIndex) => {
  if (notifId.startsWith("invite_")) {
    if (buttonIndex === 0) {
      // Join
      handleInviteAccept(notifId);
    } else {
      // Ignore
      chrome.notifications.clear(notifId);
      chrome.storage.session.remove(`notif_${notifId}`);
    }
  }
});

async function handleInviteAccept(notifId) {
  try {
    const data = await chrome.storage.session.get(`notif_${notifId}`);
    const inviteData = data[`notif_${notifId}`];

    if (inviteData && inviteData.lobbyLink) {
      // Step 1: Check if anticheat is running (verify with ping)
      const flagData = await chrome.storage.session.get(["anticheatRunning"]);
      let anticheatRunning = false;
      if (flagData.anticheatRunning) {
        anticheatRunning = await isAnticheatAlive();
        if (!anticheatRunning) {
          console.log("L4D2 Enhanced [BG]: Anticheat was closed, clearing flag.");
          await chrome.storage.session.set({ anticheatRunning: false });
        }
      }

      if (!anticheatRunning) {
        await launchAnticheatBeforeJoin();
      } else {
        console.log("L4D2 Enhanced [BG]: Anticheat verified running, skipping launch before join.");
      }

      // Step 2: Try to find an existing L4D2 tab, or open a new one
      const tabs = await chrome.tabs.query({ url: L4D2_URL_PATTERN });
      let targetTab;

      if (tabs.length > 0) {
        targetTab = tabs[0];
        await chrome.tabs.update(targetTab.id, {
          url: inviteData.lobbyLink,
          active: true,
        });
        await chrome.windows.update(targetTab.windowId, { focused: true });
      } else {
        targetTab = await chrome.tabs.create({ url: inviteData.lobbyLink });
      }

      // Step 3: Trigger the anticheat login on the tab once it loads (only if not already running)
      if (!anticheatRunning) {
        chrome.tabs.onUpdated.addListener(function loginOnLoad(tabId, info) {
          if (tabId === targetTab.id && info.status === "complete") {
            chrome.tabs.onUpdated.removeListener(loginOnLoad);
            chrome.tabs.sendMessage(targetTab.id, { type: "triggerLogin" }).catch(() => {});
          }
        });
      }
    }

    chrome.notifications.clear(notifId);
    chrome.storage.session.remove(`notif_${notifId}`);
  } catch (err) {
    console.error("L4D2 Enhanced [BG]: Error handling invite click", err);
  }
}

// --- GitHub Update Checker ---

const GITHUB_REPO = "taaeee/L4D2Center-Enhanced";
const UPDATE_ALARM_NAME = "updateCheckAlarm";
const UPDATE_CHECK_INTERVAL_MINUTES = 360; // 6 hours

// Compare semver strings: returns true if remote > local
function isNewerVersion(remote, local) {
  const r = remote.replace(/^v/, "").split(".").map(Number);
  const l = local.split(".").map(Number);
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    const rv = r[i] || 0;
    const lv = l[i] || 0;
    if (rv > lv) return true;
    if (rv < lv) return false;
  }
  return false;
}

async function checkForUpdate() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      { headers: { "Accept": "application/vnd.github.v3+json" } }
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const release = await res.json();

    const remoteVersion = release.tag_name.replace(/^v/, "");
    const localVersion = chrome.runtime.getManifest().version;
    const hasUpdate = isNewerVersion(remoteVersion, localVersion);

    // Find the .zip asset or fallback to zipball_url
    const zipAsset = release.assets?.find((a) => a.name.endsWith(".zip"));
    const downloadUrl = zipAsset ? zipAsset.browser_download_url : release.zipball_url;

    await chrome.storage.local.set({
      updateAvailable: hasUpdate,
      updateVersion: remoteVersion,
      updateUrl: downloadUrl,
      updateNotes: release.body || "",
      updateCheckedAt: Date.now(),
    });

    console.log(
      `L4D2 Enhanced [BG]: Update check — local=${localVersion} remote=${remoteVersion} update=${hasUpdate}`
    );
    return { hasUpdate, version: remoteVersion };
  } catch (err) {
    console.error("L4D2 Enhanced [BG]: Update check failed:", err.message);
    return { hasUpdate: false, error: err.message };
  }
}

async function getChangelog() {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=10`,
      { headers: { "Accept": "application/vnd.github.v3+json" } }
    );
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const releases = await res.json();

    return releases.map((r) => ({
      version: r.tag_name.replace(/^v/, ""),
      name: r.name || r.tag_name,
      date: r.published_at,
      notes: r.body || "",
      url: r.html_url,
    }));
  } catch (err) {
    console.error("L4D2 Enhanced [BG]: Changelog fetch failed:", err.message);
    return [];
  }
}

// Set up update check alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === UPDATE_ALARM_NAME) {
    checkForUpdate();
  }
});

// Create alarm on startup + do initial check
chrome.alarms.create(UPDATE_ALARM_NAME, {
  delayInMinutes: 1,
  periodInMinutes: UPDATE_CHECK_INTERVAL_MINUTES,
});
checkForUpdate();

// Post-update: set flag to show "What's New" on next popup open
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "update") {
    const newVersion = chrome.runtime.getManifest().version;
    chrome.storage.local.set({ showWhatsNew: true, whatsNewVersion: newVersion });
    // Clear stale update banner since we just updated
    chrome.storage.local.set({ updateAvailable: false });
    console.log(`L4D2 Enhanced [BG]: Updated to v${newVersion}, will show What's New.`);
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "checkForUpdate") {
    checkForUpdate().then(sendResponse);
    return true;
  }
  if (message.type === "getChangelog") {
    getChangelog().then(sendResponse);
    return true;
  }
});

// Helper: Launch anticheat exe via native messaging (returns a promise)
function launchAnticheatBeforeJoin() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["anticheatPath"], (result) => {
      if (!result.anticheatPath) {
        console.log("L4D2 Enhanced [BG]: Anticheat path not set, skipping launch.");
        resolve();
        return;
      }

      chrome.runtime.sendNativeMessage(
        NATIVE_HOST_NAME,
        { action: "launch", path: result.anticheatPath },
        (response) => {
          if (chrome.runtime.lastError) {
            console.warn("L4D2 Enhanced [BG]: Anticheat launch error (may already be running):", chrome.runtime.lastError.message);
          } else {
            console.log("L4D2 Enhanced [BG]: Anticheat launched before join:", response);
            // Do NOT set the flag here — only set after successful LOGIN
          }
          // Wait 3s for the anticheat to start before proceeding
          setTimeout(resolve, 3000);
        }
      );
    });
  });
}

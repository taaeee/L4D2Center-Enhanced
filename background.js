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
// Re-create the alarm if autoReady was previously enabled
// (handles browser restart, SW wake-up, extension update)
chrome.storage.local.get(["autoReady"], (result) => {
  if (result.autoReady) {
    setAutoReadyAlarm(true);
  }
});

// --- Native Messaging: Launch Anticheat ---
const NATIVE_HOST_NAME = "com.l4d2center.enhanced";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "launchAnticheat") {
    chrome.storage.local.get(["anticheatPath"], (result) => {
      const exePath = result.anticheatPath;

      if (!exePath) {
        sendResponse({
          success: false,
          error:
            "Anticheat path not configured. Set it in the extension popup.",
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
            sendResponse(response);
          }
        }
      );
    });
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
      // Step 1: Launch the anticheat exe if path is configured
      await launchAnticheatBeforeJoin();

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

      // Step 3: Trigger the anticheat login on the tab once it loads
      chrome.tabs.onUpdated.addListener(function loginOnLoad(tabId, info) {
        if (tabId === targetTab.id && info.status === "complete") {
          chrome.tabs.onUpdated.removeListener(loginOnLoad);
          chrome.tabs.sendMessage(targetTab.id, { type: "triggerLogin" }).catch(() => {});
        }
      });
    }

    chrome.notifications.clear(notifId);
    chrome.storage.session.remove(`notif_${notifId}`);
  } catch (err) {
    console.error("L4D2 Enhanced [BG]: Error handling invite click", err);
  }
}

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
          }
          // Wait 3s for the anticheat to start before proceeding
          setTimeout(resolve, 3000);
        }
      );
    });
  });
}

// L4D2 Center Enhanced - Queue Monitor & Avoid List
// Shows current queue players in a panel and alerts when avoided players are found



import { createClient } from '@supabase/supabase-js';

const QueueMonitor = {
  // State
  queuePlayers: [],
  avoidList: [],
  isScanning: false,
  avatarCache: {},
  interceptorReady: false,
  pendingScan: false,
  supabase: null,
  autoRefreshInterval: null,
  autoRefreshEnabled: true,
  AUTO_REFRESH_MS: 30000, // 30 seconds
  panelVisible: false,

  // Avatar system
  DEFAULT_AVATAR: "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg",
  avatarCache: {},
  supabaseConfig: {
    url: "https://vctxtgacwuprmivvgclw.supabase.co",
    key: "sb_publishable_x6a3UfdTi8NpEyqFqhL31A_ZS5RCjfg",
  },

  // Rank badge system: https://l4d2center.com/images/badges/{1-9}.svg
  BADGE_BASE_URL: "https://l4d2center.com/images/badges/",

  // Get badge number (1-9) from MMR value
  getBadgeNumber: function (mmr) {
    const m = Number(mmr) || 0;
    if (m < 2000) return 1;
    if (m >= 9000) return 9;
    // 2000-2999 → 2, 3000-3999 → 3, ... 8000-8999 → 8
    return Math.floor(m / 1000);
  },

  // Find avatar: cache → DOM → default
  findAvatar: function (steamId) {
    // 1. Check cache
    if (this.avatarCache[steamId]) return this.avatarCache[steamId];

    // 2. Check page DOM
    const playerImg = document.querySelector(
      `a[href*="steam_id=${steamId}"] img`
    );
    if (playerImg && playerImg.src) {
      this.avatarCache[steamId] = playerImg.src;
      return playerImg.src;
    }

    // 3. Default
    return this.DEFAULT_AVATAR;
  },

  // Batch-fetch avatars from Supabase edge function
  fetchAvatars: async function (steamIds) {
    if (!steamIds || steamIds.length === 0) return;

    // Filter to only uncached IDs
    const uncached = steamIds.filter((id) => !this.avatarCache[id]);
    if (uncached.length === 0) return;

    if (!this.supabase) {
      this.supabase = createClient(this.supabaseConfig.url, this.supabaseConfig.key, {
        auth: { persistSession: false }
      });
    }

    // Process in chunks of 100
    const CHUNK_SIZE = 100;
    for (let i = 0; i < uncached.length; i += CHUNK_SIZE) {
      const chunk = uncached.slice(i, i + CHUNK_SIZE);

      try {
        const response = await fetch(`${this.supabaseConfig.url}/functions/v1/steam-avatars`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.supabaseConfig.key}`,
            apikey: this.supabaseConfig.key,
          },
          body: JSON.stringify({ steamids: chunk })
        });

        if (!response.ok) {
          const text = await response.text();
          console.warn("L4D2 Enhanced: Avatar API raw error", response.status, text);
          continue;
        }

        const data = await response.json();
        if (data && data.avatars) {
          Object.assign(this.avatarCache, data.avatars);
          this.renderPanel();
        }
      } catch (err) {
        console.warn("L4D2 Enhanced: Failed to fetch avatars chunk", err);
      }
    }
  },

  // SVG Icons
  ICONS: {
    refresh: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>`,
    avoid: `<svg width="14" height="14" viewBox="0 0 416 472" fill="currentColor"><path fill="currentColor" d="M10 402q19 27 53 27h288q32 0 53-27q21-32 5-67l-75-162l-71-132Q247 7 208 7q-40 0-55 34L82 173L5 333q-13 39 5 69m36-47l75-160l70-133q6-12 19-12t19 12l69 133l76 162q9 14-2 23q-9 9-17 9H63q-8 0-17-9q-6-16 0-25m162-75q21 0 21-21v-86q0-21-21-21t-21 21v86q0 21 21 21m21 43q0 8-6 14.5t-15 6.5t-15-6.5t-6-14.5q0-9 6-15.5t15-6.5t15 6.5t6 15.5"/></svg>`,
    remove: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`,
    warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
    queue: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>`,
  },

  // Initialize the queue monitor
  init: function () {
    console.log("L4D2 Enhanced: Initializing Queue Monitor...");

    // Load avoid list from storage
    this.loadAvoidList();

    // Listen for queue scan responses from interceptor
    window.addEventListener("message", (event) => {
      if (
        event.data &&
        event.data.type === "L4D2_QUEUE_SCAN_RESPONSE"
      ) {
        this.handleScanResponse(event.data);
      }
    });

    // Listen for avoid list changes from popup
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === "local" && changes.avoidList) {
        this.avoidList = changes.avoidList.newValue || [];
        this.renderPanel();
      }
    });

    // Create the panel
    this.createPanel();

    // Initial scan after a short delay
    setTimeout(() => this.startScan(), 2000);

    // Start auto-refresh
    this.startAutoRefresh();
  },

  // Load avoid list from chrome.storage.local
  loadAvoidList: function () {
    chrome.storage.local.get(["avoidList"], (result) => {
      this.avoidList = result.avoidList || [];
      console.log(
        `L4D2 Enhanced: Loaded ${this.avoidList.length} avoided players`
      );
    });
  },

  // Save avoid list to chrome.storage.local
  saveAvoidList: function () {
    chrome.storage.local.set({ avoidList: this.avoidList });
  },

  // Add a player to the avoid list
  addToAvoidList: function (steamId64, nickname) {
    if (!Array.isArray(this.avoidList)) {
      this.avoidList = [];
    }
    if (this.avoidList.find((p) => p.steamId64 === steamId64)) {
      this.showToast(`${nickname} ya está en tu lista de avoid`, "info");
      return;
    }

    this.avoidList.push({
      steamId64: steamId64,
      nickname: nickname || "Unknown",
      addedAt: Date.now(),
    });

    this.saveAvoidList();
    this.showToast(`${nickname} agregado a la avoid list`, "success");
    this.renderPanel();
  },

  // Remove a player from the avoid list
  removeFromAvoidList: function (steamId64) {
    if (!Array.isArray(this.avoidList)) {
      this.avoidList = [];
    }
    const player = this.avoidList.find((p) => p.steamId64 === steamId64);
    this.avoidList = this.avoidList.filter((p) => p.steamId64 !== steamId64);
    this.saveAvoidList();
    if (player) {
      this.showToast(
        `${player.nickname} removido de la avoid list`,
        "success"
      );
    }
    this.renderPanel();
  },

  // Check if a player is on the avoid list
  isAvoided: function (steamId64) {
    if (!Array.isArray(this.avoidList)) {
      this.avoidList = [];
    }
    return this.avoidList.some((p) => p.steamId64 === steamId64);
  },

  // Start a queue scan via the interceptor
  startScan: function () {
    if (this.isScanning) return;
    
    // Ensure interceptor is ready before scanning
    if (!this.interceptorReady) {
      this.pendingScan = true;
      this.updateScanStatus("Esperando interceptor...");
      return;
    }

    this.pendingScan = false;
    this.isScanning = true;
    this.updateScanStatus("Escaneando...");
    window.postMessage({ type: "L4D2_QUEUE_SCAN_REQUEST" }, "*");
  },

  // Handle scan response from interceptor
  handleScanResponse: function (data) {
    this.isScanning = false;

    if (data.success) {
      this.queuePlayers = data.players;
      console.log(
        `L4D2 Enhanced: Queue scan complete — ${this.queuePlayers.length} players in queue`
      );

      // Log MyParty for each player that has party members
      this.queuePlayers.forEach((p) => {
        if (p.MyParty && p.MyParty.length > 0) {
          console.log(
            `L4D2 Enhanced: MyParty of ${p.Nickname} (${p.SteamID64}):`,
            p.MyParty
          );
        }
      });

      // Check for avoided players
      const avoidedInQueue = this.queuePlayers.filter((p) =>
        this.isAvoided(p.SteamID64)
      );

      if (avoidedInQueue.length > 0) {
        this.showAvoidAlert(avoidedInQueue);
      }

      this.renderPanel();
      this.updateScanStatus(
        `Actualizado: ${new Date().toLocaleTimeString()}`
      );

      // Batch-fetch avatars for players not in cache (async, re-renders on completion)
      const steamIds = this.queuePlayers.map((p) => p.SteamID64);
      this.fetchAvatars(steamIds);
    } else {
      console.error("L4D2 Enhanced: Queue scan failed", data.error);
      this.updateScanStatus(`Error: ${data.error}`);
    }
  },

  // Show alert for avoided players in queue
  showAvoidAlert: function (avoidedPlayers) {
    const names = avoidedPlayers.map((p) => p.Nickname).join(", ");
    this.showToast(
      `⚠️ ¡Jugadores en avoid detectados en cola! ${names}`,
      "error",
      6000
    );

    // Also play a subtle sound effect using the Notification API pattern
    try {
      if (Notification.permission === "granted") {
        new Notification("L4D2 Center Enhanced — Avoid Alert", {
          body: `Jugadores en avoid en cola: ${names}`,
          icon: "https://64.media.tumblr.com/49123a4f55029539164466aeefa3d458/e331e3b5efa1e6df-f4/s250x400/07afb4f44a6cf0776616f864ee28ea8548e4496a.pnj",
          tag: "avoid-alert",
        });
      }
    } catch (e) {
      // Notifications might not be available
    }
  },

  // Auto-refresh management
  startAutoRefresh: function () {
    if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
    if (this.autoRefreshEnabled) {
      this.autoRefreshInterval = setInterval(() => {
        // Scan if the panel is visible (now visible even when searching for a game)
        if (this.panelVisible && !this.isScanning) {
          this.startScan();
        }
      }, this.AUTO_REFRESH_MS);
    }
  },

  stopAutoRefresh: function () {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  },

  // Toast notification (reusing existing notification system)
  showToast: function (message, type = "success", duration = 3000) {
    if (window.L4D2Invitations) {
      window.L4D2Invitations.showNotification(message, type, duration);
    } else {
      // Fallback: create our own toast
      const notification = document.createElement("div");
      notification.className = `l4d2-notification l4d2-notification--${type}`;
      notification.innerHTML = `
        <div class="l4d2-notification__content">
          <span class="l4d2-notification__icon">${
            type === "success" ? "✓" : type === "error" ? "⚠" : "ℹ"
          }</span>
          <span class="l4d2-notification__message">${message}</span>
        </div>
      `;
      document.body.appendChild(notification);
      requestAnimationFrame(() => {
        notification.classList.add("l4d2-notification--show");
      });
      setTimeout(() => {
        notification.classList.remove("l4d2-notification--show");
        setTimeout(() => notification.remove(), 300);
      }, duration);
    }
  },

  // Create the Queue Monitor panel in the DOM
  createPanel: function () {
    if (document.getElementById("l4d2-queue-monitor")) return;

    const panel = document.createElement("div");
    panel.id = "l4d2-queue-monitor";
    panel.className = "chat players queue-monitor-panel";
    panel.innerHTML = this.getPanelHTML();

    // Insert after the playerpanel
    const playerPanel = document.getElementById("playerpanel");
    if (playerPanel && playerPanel.parentNode) {
      playerPanel.parentNode.insertBefore(panel, playerPanel.nextSibling);
      console.log("L4D2 Enhanced: Appended Queue Monitor directly after #playerpanel");
    } else {
      // Fallback: try content__right area
      const mainContent = document.querySelector(".content__right") || document.body;
      mainContent.appendChild(panel);
      console.log("L4D2 Enhanced: Appended Queue Monitor to fallback:", mainContent.className || mainContent.tagName);
    }

    this.panelVisible = true;
    this.bindPanelEvents();

    // Render immediately if we already have players in memory
    if (this.queuePlayers && this.queuePlayers.length > 0) {
      this.renderPanel();
    }

    // Start a fresh scan to get latest data
    this.startScan();
  },

  // Remove the panel
  removePanel: function () {
    const panel = document.getElementById("l4d2-queue-monitor");
    if (panel) panel.remove();
    this.panelVisible = false;
  },

  // Show/hide the panel based on queue state
  setPanelVisibility: function (visible) {
    const panel = document.getElementById("l4d2-queue-monitor");
    if (!panel) {
      if (visible) this.createPanel();
      return;
    }

    if (visible) {
      panel.style.display = "";
      this.panelVisible = true;
      // Re-scan when showing
      if (!this.isScanning) this.startScan();
    } else {
      panel.style.display = "none";
      this.panelVisible = false;
    }
  },

  // Generate panel HTML
  getPanelHTML: function () {
    return `
      <div class="chat__head">
        <div class="chat__head__header">
          ${this.ICONS.queue}
          Cola Actual
        </div>
        <div class="qm-head-right">
          <div class="chat-item">
            <div class="chat-item__title">En Cola:<span id="qm-count" class="qm-count-badge">0</span></div>
          </div>
          <button class="queue-monitor__refresh-btn" id="qm-refresh" title="Actualizar">
            ${this.ICONS.refresh}
          </button>
        </div>
      </div>
      <div class="queue-monitor__status" id="qm-status">Iniciando...</div>
      <div class="queue-monitor__alert" id="qm-alert" style="display:none;">
        ${this.ICONS.warning}
        <span id="qm-alert-text"></span>
      </div>
      <div class="chat__main">
        <div class="chat-content__wrap">
          <div class="chat-content" id="qm-list">
            <div class="queue-monitor__empty">Escaneando jugadores en cola...</div>
          </div>
        </div>
      </div>
    `;
  },

  // Bind events for the panel controls
  bindPanelEvents: function () {
    const refreshBtn = document.getElementById("qm-refresh");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        if (!this.isScanning) this.startScan();
      });
    }

    // Close any open player row options on click outside
    document.addEventListener("click", () => {
      document.querySelectorAll(".chat-content__item_right.qm-show-options").forEach(el => {
        el.classList.remove("qm-show-options");
      });
    });
  },

  // Update the scan status text
  updateScanStatus: function (text) {
    const statusEl = document.getElementById("qm-status");
    if (statusEl) statusEl.textContent = text;
  },

  // Render the queue list panel with current data
  renderPanel: function () {
    const listEl = document.getElementById("qm-list");
    const countEl = document.getElementById("qm-count");
    const alertEl = document.getElementById("qm-alert");
    const alertTextEl = document.getElementById("qm-alert-text");

    if (!listEl) return;

    const inQueuePlayers = this.queuePlayers.filter(p => p.IsInQueue);

    // Update count
    if (countEl) countEl.textContent = inQueuePlayers.length;

    // Check for avoided players in queue
    const avoidedInQueue = inQueuePlayers.filter((p) =>
      this.isAvoided(p.SteamID64)
    );

    // Show/hide alert
    if (alertEl && alertTextEl) {
      if (avoidedInQueue.length > 0) {
        const names = avoidedInQueue.map((p) => p.Nickname).join(", ");
        alertTextEl.textContent = `¡Jugadores en avoid en cola! ${names}`;
        alertEl.style.display = "";
      } else {
        alertEl.style.display = "none";
      }
    }

    // Render player list
    if (inQueuePlayers.length === 0) {
      listEl.innerHTML =
        '<div class="queue-monitor__empty">No hay jugadores en cola</div>';
      return;
    }

    // Sort: avoided players first, then by MMR descending
    const sorted = [...inQueuePlayers].sort((a, b) => {
      const aAvoided = this.isAvoided(a.SteamID64) ? 0 : 1;
      const bAvoided = this.isAvoided(b.SteamID64) ? 0 : 1;
      if (aAvoided !== bAvoided) return aAvoided - bAvoided;
      return (b.Mmr || 0) - (a.Mmr || 0);
    });

    listEl.innerHTML = "";
    sorted.forEach((player) => {
      const isAvoided = this.isAvoided(player.SteamID64);
      const item = document.createElement("div");
      item.className = `chat-content__item qm-player-row${
        isAvoided ? " qm-player-row--avoided" : ""
      }`;
      item.dataset.steamid = player.SteamID64;

      const partyInfo =
        player.PartyMembersCount > 1
          ? `<span class="queue-monitor__party" title="En party de ${player.PartyMembersCount}">👥 ${player.PartyMembersCount}</span>`
          : "";

      const avoidBadge = isAvoided
        ? '<span class="queue-monitor__avoid-badge">AVOID</span>'
        : "";

      const avoidBtn = isAvoided
        ? `<button class="queue-monitor__action-btn queue-monitor__action-btn--remove" title="Quitar de avoid" data-steamid="${player.SteamID64}">${this.ICONS.remove}</button>`
        : `<button class="queue-monitor__action-btn queue-monitor__action-btn--avoid" title="Agregar a avoid" data-steamid="${player.SteamID64}" data-nickname="${this.escapeAttr(player.Nickname)}">${this.ICONS.avoid}</button>`;

      const avatarUrl = this.findAvatar(player.SteamID64);

      // Status text
      let statuses = [];
      if (player.IsInGame) statuses.push('<span class="chat-content__lobby ingame">In Game</span>');
      const statusText = statuses.join(' ');

      const badgeNum = this.getBadgeNumber(player.Mmr);
      const badgeClass = `qm-badge qm-badge--${badgeNum}`;
      const badgeStyle = `background-image: url('${this.BADGE_BASE_URL}${badgeNum}.svg') !important;`;

      item.innerHTML = `
        <div class="chat-content__item_left">
          <a href="https://l4d2center.com/profile/?steam_id=${player.SteamID64}" target="_blank" title="${this.escapeAttr(player.Nickname)}">
            <img class="chat-content__item_img" src="${avatarUrl}" alt="" />
          </a>
          <div class="chat-content__item_info">
            <a href="https://l4d2center.com/profile/?steam_id=${player.SteamID64}" target="_blank" class="chat-content__item_name">${this.escapeHtml(player.Nickname)}</a>
            <div class="chat-content__item_meta">
              ${statusText}
              ${avoidBadge}
              ${partyInfo}
            </div>
          </div>
        </div>
        <div class="chat-content__item_right">
          <div class="queue-monitor__mmr ${badgeClass}" style="${badgeStyle}">
            ${player.Mmr}
          </div>
          ${avoidBtn}
          <button class="qm-options-toggle" title="Ver opciones">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
          </button>
        </div>
      `;

      // Bind avoid/remove button
      const actionBtn = item.querySelector(".queue-monitor__action-btn");
      if (actionBtn) {
        actionBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const sid = actionBtn.dataset.steamid;
          if (actionBtn.classList.contains("queue-monitor__action-btn--avoid")) {
            const nick = actionBtn.dataset.nickname;
            this.addToAvoidList(sid, nick);
          } else {
            this.removeFromAvoidList(sid);
          }
        });
      }

      // Bind options toggle button
      const optionsToggleBtn = item.querySelector(".qm-options-toggle");
      if (optionsToggleBtn) {
        optionsToggleBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const rightContainer = item.querySelector(".chat-content__item_right");
          if (rightContainer) {
            const isOpening = !rightContainer.classList.contains("qm-show-options");
            
            // Close all other open options first
            document.querySelectorAll(".chat-content__item_right.qm-show-options").forEach(el => {
              if (el !== rightContainer) {
                el.classList.remove("qm-show-options");
              }
            });
            
            if (isOpening) {
              rightContainer.classList.add("qm-show-options");
            } else {
              rightContainer.classList.remove("qm-show-options");
            }
          }
        });
      }

      listEl.appendChild(item);
    });
  },

  // Inject avoid buttons into the existing player list on the page
  injectAvoidButton: function (node) {
    // Skip if already has our button or is in the queue monitor panel
    if (node.querySelector(".qm-avoid-btn")) return;
    if (node.closest("#l4d2-queue-monitor")) return;
    if (node.closest("#l4d2-friends-panel")) return;

    const right = node.querySelector(".chat-content__item_right");
    if (!right) return;

    const link = node.querySelector('a[href*="steam_id="]');
    if (!link) return;

    const match = link.href.match(/steam_id=(\d+)/);
    if (!match) return;
    const targetSteamId = match[1];

    // Get the player nickname from the DOM
    const nameEl = node.querySelector(".chat-content__lobby")
      || node.querySelector(".chat-content__item_name")
      || node.querySelector("a");
    const nickname = nameEl ? nameEl.textContent.trim().split("\n")[0].trim() : "Unknown";

    const isCurrentlyAvoided = this.isAvoided(targetSteamId);

    const btn = document.createElement("span");
    btn.className = "qm-avoid-btn";
    btn.title = isCurrentlyAvoided ? "Quitar de avoid list" : "Agregar a avoid list";
    btn.innerHTML = isCurrentlyAvoided
      ? `<span class="qm-avoid-btn__icon qm-avoid-btn__icon--active">${this.ICONS.avoid}</span>`
      : `<span class="qm-avoid-btn__icon">${this.ICONS.avoid}</span>`;

    if (isCurrentlyAvoided) {
      btn.classList.add("qm-avoid-btn--active");
    }

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.isAvoided(targetSteamId)) {
        this.removeFromAvoidList(targetSteamId);
        btn.classList.remove("qm-avoid-btn--active");
        btn.title = "Agregar a avoid list";
        btn.innerHTML = `<span class="qm-avoid-btn__icon">${this.ICONS.avoid}</span>`;
      } else {
        this.addToAvoidList(targetSteamId, nickname);
        btn.classList.add("qm-avoid-btn--active");
        btn.title = "Quitar de avoid list";
        btn.innerHTML = `<span class="qm-avoid-btn__icon qm-avoid-btn__icon--active">${this.ICONS.avoid}</span>`;
      }
    });

    right.insertBefore(btn, right.firstChild);

    // Inject options toggle button for native players list to support smooth actions drawer
    if (!right.querySelector(".qm-options-toggle")) {
      const toggleBtn = document.createElement("button");
      toggleBtn.className = "qm-options-toggle";
      toggleBtn.title = "Ver opciones";
      toggleBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>`;

      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isOpening = !right.classList.contains("qm-show-options");

        // Close all other open options first
        document.querySelectorAll(".chat-content__item_right.qm-show-options").forEach(el => {
          if (el !== right) {
            el.classList.remove("qm-show-options");
          }
        });

        if (isOpening) {
          right.classList.add("qm-show-options");
        } else {
          right.classList.remove("qm-show-options");
        }
      });

      right.appendChild(toggleBtn);
    }
  },

  // Utility: escape HTML
  escapeHtml: function (str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  // Utility: escape attribute
  escapeAttr: function (str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  },
};

// Make global
window.L4D2QueueMonitor = QueueMonitor;

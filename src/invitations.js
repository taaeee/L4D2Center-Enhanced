// L4D2 Center Enhanced - Invitation & Friends System
// Powered by Supabase

const Invitations = {
  supabase: null,
  currentUser: null,
  friends: [],
  pendingInvites: [],
  avatarCache: {},
  config: {
    url: "https://vctxtgacwuprmivvgclw.supabase.co",
    key: "sb_publishable_x6a3UfdTi8NpEyqFqhL31A_ZS5RCjfg",
  },

  // Icon URLs (set in init)
  icons: {
    addFriend: null,
    deleteFriend: null,
    friends: null,
    invite: null,
    edit: null,
  },

  // Initialize icon URLs
  initIcons: function () {
    if (typeof chrome !== "undefined" && chrome.runtime) {
      this.icons.addFriend = chrome.runtime.getURL("icons/add_friend.svg");
      this.icons.deleteFriend = chrome.runtime.getURL(
        "icons/delete_friend.svg"
      );
      this.icons.friends = chrome.runtime.getURL("icons/friends.svg");
      this.icons.invite = chrome.runtime.getURL("icons/invite_sent.svg");
      this.icons.edit = chrome.runtime.getURL("icons/nickname_edit.svg");
    }
  },

  // Default avatar placeholder
  DEFAULT_AVATAR: "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg",

  // Helper: Find avatar from page DOM or cache
  findAvatarInPage: function (steamId) {
    // 1. Try to find the player's avatar from the page DOM (fastest)
    const playerLink = document.querySelector(
      `a[href*="steam_id=${steamId}"] img`
    );
    if (playerLink) {
      return playerLink.src;
    }
    // 2. Check in-memory cache (from previous API calls)
    if (this.avatarCache[steamId]) {
      return this.avatarCache[steamId];
    }
    // 3. Fallback to default placeholder
    return this.DEFAULT_AVATAR;
  },

  // Fetch avatars from Steam API via Supabase Edge Function
  fetchAvatarsFromApi: async function (steamIds) {
    if (!steamIds || steamIds.length === 0) return {};

    // Filter out IDs we already have cached
    const uncached = steamIds.filter((id) => !this.avatarCache[id]);
    if (uncached.length === 0) return this.avatarCache;

    try {
      const response = await fetch(
        `${this.config.url}/functions/v1/steam-avatars`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.config.key}`,
          },
          body: JSON.stringify({ steamids: uncached }),
        }
      );

      if (!response.ok) {
        console.warn("L4D2 Enhanced: Steam avatar API error", response.status);
        return this.avatarCache;
      }

      const data = await response.json();
      if (data.avatars) {
        Object.assign(this.avatarCache, data.avatars);
      }
    } catch (err) {
      console.warn("L4D2 Enhanced: Failed to fetch Steam avatars", err);
    }

    return this.avatarCache;
  },

  // Update avatar images in the friends list after API fetch
  updateFriendAvatars: async function () {
    const steamIds = this.friends.map((f) => f.friend_steamid);
    
    // Find which friends don't have a DOM avatar (need API fetch)
    const needFetch = steamIds.filter((id) => {
      const domImg = document.querySelector(
        `.chat.players a[href*="steam_id=${id}"] img`
      );
      return !domImg && !this.avatarCache[id];
    });

    if (needFetch.length === 0) return;

    await this.fetchAvatarsFromApi(needFetch);

    // Update the <img> elements in the friends list
    needFetch.forEach((steamId) => {
      if (this.avatarCache[steamId]) {
        const friendItem = document.querySelector(
          `.friend-item[data-steamid="${steamId}"] .friend-item__avatar`
        );
        if (friendItem) {
          friendItem.src = this.avatarCache[steamId];
        }
      }
    });
  },

  init: async function () {
    console.log("L4D2 Enhanced: Initializing Invitations...");

    // Initialize icon URLs
    this.initIcons();

    this.currentUser = this.identifyUser();
    if (!this.currentUser) {
      console.log(
        "L4D2 Enhanced: Could not identify current user (not logged in?)"
      );
      return;
    }
    console.log(`L4D2 Enhanced: Identified User ${this.currentUser}`);

    if (
      typeof window.supabase !== "undefined" &&
      window.supabase.createClient
    ) {
      this.supabase = window.supabase.createClient(
        this.config.url,
        this.config.key
      );
      this.startHeartbeat();
      this.listenForInvites();
      await this.loadFriends();
    } else {
      console.warn(
        "L4D2 Enhanced: Supabase client not found. Skipped connection."
      );
    }

    // Always create the notification center
    this.initNotificationCenter();
  },

  identifyUser: function () {
    const links = document.querySelectorAll('a[href*="profile/?steam_id="]');
    for (let link of links) {
      const match = link.href.match(/steam_id=(\d+)/);
      if (match) return match[1];
    }
    return null;
  },

  startHeartbeat: async function () {
    if (!this.supabase || !this.currentUser) return;

    const update = async () => {
      const { error } = await this.supabase.from("users").upsert({
        steamid: this.currentUser,
        last_seen: new Date().toISOString(),
      });
      if (error) console.error("L4D2 Enhanced: Heartbeat error", error);
    };

    update();
    setInterval(update, 60000);
  },

  listenForInvites: function () {
    if (!this.supabase || !this.currentUser) return;

    this.supabase
      .channel("public:invitations")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "invitations",
          filter: `to_steamid=eq.${this.currentUser}`,
        },
        (payload) => {
          this.handleNewInvite(payload.new);
        }
      )
      .subscribe();
  },

  handleNewInvite: function (invite) {
    if (invite.status !== "pending") return;

    const friend = this.friends.find(
      (f) => f.friend_steamid === invite.from_steamid
    );
    const displayName = friend?.nickname || `User ${invite.from_steamid}`;
    const avatarUrl = this.findAvatarInPage(invite.from_steamid);

    // Add to notification center
    this.addNotification({
      id: invite.id || Date.now(),
      displayName: displayName,
      avatarUrl: avatarUrl,
      lobbyLink: invite.lobby_link,
      fromSteamId: invite.from_steamid,
      time: new Date(),
    });

    // Send browser notification (visible from any window)
    try {
      chrome.runtime.sendMessage({
        type: "gameInvite",
        displayName: displayName,
        lobbyLink: invite.lobby_link,
        fromSteamId: invite.from_steamid,
      });
    } catch (err) {
      console.warn("L4D2 Enhanced: Could not send browser notification", err);
    }
  },

  // ========== NOTIFICATION SYSTEM ==========

  showNotification: function (message, type = "success", duration = 3000) {
    const notification = document.createElement("div");
    notification.className = `l4d2-notification l4d2-notification--${type}`;
    notification.innerHTML = `
      <div class="l4d2-notification__content">
        <span class="l4d2-notification__icon">${
          type === "success" ? "✓" : type === "error" ? "✕" : "ℹ"
        }</span>
        <span class="l4d2-notification__message">${message}</span>
      </div>
    `;

    document.body.appendChild(notification);

    // Trigger animation
    requestAnimationFrame(() => {
      notification.classList.add("l4d2-notification--show");
    });

    // Auto remove
    setTimeout(() => {
      notification.classList.remove("l4d2-notification--show");
      setTimeout(() => notification.remove(), 300);
    }, duration);
  },

  // ========== NOTIFICATION CENTER ==========

  initNotificationCenter: function () {
    if (document.getElementById("l4d2-notif-center")) return;

    const bellSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16"><path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2m.995-14.901a1 1 0 1 0-1.99 0A5 5 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901"/></svg>`;

    const center = document.createElement("div");
    center.id = "l4d2-notif-center";
    center.innerHTML = `
      <div id="l4d2-notif-bell" class="notif-bell" title="Notifications">
        ${bellSvg}
        <span id="l4d2-notif-badge" class="notif-badge" style="display:none;">0</span>
      </div>
      <div id="l4d2-notif-panel" class="notif-panel">
        <div class="notif-panel__header">
          <span>Notifications</span>
          <span id="l4d2-notif-clear" class="notif-panel__clear">Clear all</span>
        </div>
        <div id="l4d2-notif-list" class="notif-panel__list">
          <div class="notif-panel__empty">No notifications</div>
        </div>
      </div>
    `;

    document.body.appendChild(center);

    // Toggle panel
    document.getElementById("l4d2-notif-bell").onclick = () => {
      const panel = document.getElementById("l4d2-notif-panel");
      panel.classList.toggle("notif-panel--open");
    };

    // Close when clicking outside
    document.addEventListener("click", (e) => {
      const center = document.getElementById("l4d2-notif-center");
      const panel = document.getElementById("l4d2-notif-panel");
      if (center && panel && !center.contains(e.target)) {
        panel.classList.remove("notif-panel--open");
      }
    });

    // Clear all
    document.getElementById("l4d2-notif-clear").onclick = (e) => {
      e.stopPropagation();
      this.pendingInvites = [];
      this.renderNotifications();
    };
  },

  addNotification: function (inviteData) {
    this.pendingInvites.unshift(inviteData);
    // Keep max 10
    if (this.pendingInvites.length > 10) this.pendingInvites.pop();
    this.renderNotifications();
  },

  renderNotifications: function () {
    const list = document.getElementById("l4d2-notif-list");
    const badge = document.getElementById("l4d2-notif-badge");
    if (!list || !badge) return;

    const count = this.pendingInvites.length;

    // Update badge
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = "flex";
    } else {
      badge.style.display = "none";
    }

    // Render list
    if (count === 0) {
      list.innerHTML = '<div class="notif-panel__empty">No notifications</div>';
      return;
    }

    list.innerHTML = "";
    this.pendingInvites.forEach((inv, index) => {
      const item = document.createElement("div");
      item.className = "notif-item";
      item.innerHTML = `
        <img class="notif-item__avatar" src="${inv.avatarUrl}" alt="" />
        <div class="notif-item__info">
          <div class="notif-item__name">${inv.displayName}</div>
          <div class="notif-item__text">wants you to join their party</div>
        </div>
        <div class="notif-item__actions">
          <button class="notif-item__btn notif-item__btn--join">Join</button>
          <button class="notif-item__btn notif-item__btn--dismiss">✕</button>
        </div>
      `;

      item.querySelector(".notif-item__btn--join").onclick = async (e) => {
        e.stopPropagation();
        // Ensure anticheat is running before joining
        await this.ensureAnticheatRunning();
        if (inv.lobbyLink) {
          const targetUrl = new URL(inv.lobbyLink);
          const currentUrl = new URL(window.location.href);
          if (currentUrl.pathname === targetUrl.pathname) {
            const code = targetUrl.searchParams.get("join_party");
            if (code) {
              this.autoJoin(code);
              this.pendingInvites.splice(index, 1);
              this.renderNotifications();
              return;
            }
          }
          window.location.href = inv.lobbyLink;
        }
        this.pendingInvites.splice(index, 1);
        this.renderNotifications();
      };

      item.querySelector(".notif-item__btn--dismiss").onclick = (e) => {
        e.stopPropagation();
        this.pendingInvites.splice(index, 1);
        this.renderNotifications();
      };

      list.appendChild(item);
    });
  },

  autoJoin: function (code) {
    console.log("L4D2 Enhanced: Auto-Joining party with code", code);
    window.postMessage({ type: "L4D2_JOIN_PARTY", code: code }, "*");
  },

  // Launch anticheat + login if not already running, returns a promise
  ensureAnticheatRunning: function () {
    return new Promise((resolve) => {
      this.showNotification("Checking anticheat...", "info", 2000);

      // Step 1: Launch the exe via background native messaging
      chrome.runtime.sendMessage({ type: "launchAnticheat" }, (response) => {
        if (response && response.success) {
          console.log("L4D2 Enhanced: Anticheat launched, waiting for startup...");
          this.showNotification("Anticheat launched, logging in...", "info", 3000);
          // Wait for the anticheat to start, then perform login
          setTimeout(() => {
            this._performAnticheatLogin().then(resolve);
          }, 3000);
        } else {
          // Launch failed — exe might already be running, try login directly
          console.log("L4D2 Enhanced: Launch skipped (may already be running), attempting login...");
          this._performAnticheatLogin().then(resolve);
        }
      });
    });
  },

  // Perform the anticheat login via page interceptor; resolves when done or on timeout
  _performAnticheatLogin: function () {
    return new Promise((resolve) => {
      const responseHandler = (event) => {
        if (!event.data || event.data.type !== "L4D2_ANTICHEAT_LOGIN_RESPONSE") return;
        window.removeEventListener("message", responseHandler);

        if (event.data.success) {
          // Submit the auth token
          const form = document.createElement("form");
          form.method = "POST";
          form.action = "http://localhost:51115/auth";
          form.target = "_blank";
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = "key";
          input.value = event.data.token;
          form.appendChild(input);
          document.body.appendChild(form);
          form.submit();
          form.remove();

          this.showNotification("✓ Anticheat ready!", "success", 2000);
          console.log("L4D2 Enhanced: Anticheat login OK before joining party");
        } else {
          console.warn("L4D2 Enhanced: Anticheat login failed:", event.data?.error);
          this.showNotification("Anticheat login failed, joining anyway...", "error", 2000);
        }
        resolve();
      };

      window.addEventListener("message", responseHandler);
      window.postMessage({ type: "L4D2_ANTICHEAT_LOGIN_REQUEST" }, "*");

      // Timeout fallback — don't block the join forever
      setTimeout(() => {
        window.removeEventListener("message", responseHandler);
        console.warn("L4D2 Enhanced: Anticheat login timed out, proceeding with join");
        resolve();
      }, 8000);
    });
  },

  sendInvite: async function (targetSteamId) {
    if (!this.supabase || !this.currentUser) {
      this.showNotification("Invitation system not ready", "error");
      return;
    }

    const codeInput = document.getElementById("invitecodeoutput_inparty");
    let partyCode = "";

    if (codeInput && codeInput.value) {
      partyCode = codeInput.value;
    } else {
      console.log("L4D2 Enhanced: No party code. Attempting to create one...");
      window.postMessage({ type: "L4D2_CREATE_PARTY" }, "*");
      partyCode = await this.waitForPartyCode(3000);

      if (!partyCode) {
        if (
          !confirm("Could not create/find a Party Code. Send invite anyway?")
        ) {
          return;
        }
      }
    }

    const magicLink = new URL(window.location.href);
    if (partyCode) {
      magicLink.searchParams.set("join_party", partyCode);
    }

    const { error } = await this.supabase.from("invitations").insert({
      from_steamid: this.currentUser,
      to_steamid: targetSteamId,
      lobby_link: magicLink.toString(),
      status: "pending",
    });

    if (error) {
      this.showNotification("Failed to send invite: " + error.message, "error");
    } else {
      this.showNotification("Invite sent!", "success");
    }
  },

  // ========== FRIENDS SYSTEM ==========

  loadFriends: async function () {
    if (!this.supabase || !this.currentUser) return;

    console.log("L4D2 Enhanced: Loading friends...");
    const { data, error } = await this.supabase
      .from("friends")
      .select("*")
      .eq("owner_steamid", this.currentUser);

    if (error) {
      console.error("L4D2 Enhanced: Failed to load friends", error);
      return;
    }

    this.friends = data || [];
    console.log(`L4D2 Enhanced: Loaded ${this.friends.length} friends`);
    this.renderFriendsSection();
  },

  addFriend: async function (steamId, nickname = null) {
    if (!this.supabase || !this.currentUser) {
      this.showNotification("Friends system not ready", "error");
      return false;
    }

    if (steamId === this.currentUser) {
      this.showNotification("You can't add yourself!", "error");
      return false;
    }

    if (this.friends.find((f) => f.friend_steamid === steamId)) {
      this.showNotification("Already your friend!", "info");
      return false;
    }

    if (!nickname) {
      nickname = prompt("Enter a nickname (optional):");
    }

    // Try to get avatar URL from page
    const avatarUrl = this.findAvatarInPage(steamId);

    const { data, error } = await this.supabase
      .from("friends")
      .insert({
        owner_steamid: this.currentUser,
        friend_steamid: steamId,
        nickname: nickname || null,
      })
      .select();

    if (error) {
      console.error("L4D2 Enhanced: Failed to add friend", error);
      this.showNotification("Failed to add friend", "error");
      return false;
    }

    if (data && data[0]) {
      this.friends.push(data[0]);
    }

    this.showNotification("Friend added!", "success");
    this.renderFriendsSection();
    return true;
  },

  removeFriend: async function (steamId) {
    if (!this.supabase || !this.currentUser) return false;

    if (!confirm("Remove this friend?")) return false;

    const { error } = await this.supabase
      .from("friends")
      .delete()
      .eq("owner_steamid", this.currentUser)
      .eq("friend_steamid", steamId);

    if (error) {
      this.showNotification("Failed to remove friend", "error");
      return false;
    }

    this.friends = this.friends.filter((f) => f.friend_steamid !== steamId);
    this.showNotification("Friend removed", "success");
    this.renderFriendsSection();
    return true;
  },

  updateNickname: async function (steamId, newNickname) {
    if (!this.supabase || !this.currentUser) return false;

    const { error } = await this.supabase
      .from("friends")
      .update({ nickname: newNickname || null })
      .eq("owner_steamid", this.currentUser)
      .eq("friend_steamid", steamId);

    if (error) {
      this.showNotification("Failed to update nickname", "error");
      return false;
    }

    const friend = this.friends.find((f) => f.friend_steamid === steamId);
    if (friend) {
      friend.nickname = newNickname || null;
    }

    this.showNotification("Nickname updated!", "success");
    this.renderFriendsSection();
    return true;
  },

  renderFriendsSection: function () {
    const existing = document.getElementById("l4d2-friends-section");
    if (existing) existing.remove();

    const playersBlock = document.querySelector(".chat.players");
    if (!playersBlock) return;

    const section = document.createElement("div");
    section.id = "l4d2-friends-section";
    section.className = "chat friends-section";
    section.innerHTML = `
      <div class="chat__head">
        <div class="chat__head__header">
          <img src="${
            this.icons.friends
          }" alt="" class="friends-icon" /> Friends (${this.friends.length})
          <span id="l4d2-add-friend-manual" class="friend-action-btn add-friend-manual-btn" title="Add friend by SteamID">
            <img src="${this.icons.addFriend}" alt="Add Friend" />
          </span>
        </div>
      </div>
      <div class="chat__main">
        <div class="chat-content__wrap">
          <div class="chat-content" id="l4d2-friends-list">
            ${
              this.friends.length === 0
                ? '<div class="friends-empty">No friends yet. Click the add friend icon on a player to add them!</div>'
                : ""
            }
          </div>
        </div>
      </div>
    `;

    playersBlock.parentNode.insertBefore(section, playersBlock);

    // Manual add friend by SteamID
    document.getElementById("l4d2-add-friend-manual").onclick = (e) => {
      e.stopPropagation();
      const steamId = prompt("Enter the SteamID of the friend you want to add:\n(Example: 76561199482046041)");
      if (steamId && steamId.trim()) {
        const trimmed = steamId.trim();
        if (/^\d{17}$/.test(trimmed)) {
          this.addFriend(trimmed);
        } else {
          this.showNotification("Invalid SteamID. It should be a 17-digit number.", "error");
        }
      }
    };

    const listContainer = document.getElementById("l4d2-friends-list");
    this.friends.forEach((friend) => {
      const item = this.createFriendItem(friend);
      listContainer.appendChild(item);
    });

    // Batch-fetch missing avatars from Steam API and update
    this.updateFriendAvatars();
  },

  createFriendItem: function (friend) {
    const item = document.createElement("div");
    item.className = "chat-content__item friend-item";
    item.dataset.steamid = friend.friend_steamid;

    const displayName = friend.nickname || `Steam: ${friend.friend_steamid}`;
    const avatarUrl = this.findAvatarInPage(friend.friend_steamid);

    item.innerHTML = `
      <div class="chat-content__item_left friend-item__left">
        <a href="https://l4d2center.com/profile/?steam_id=${friend.friend_steamid}" target="_blank" title="View Profile"><img class="friend-item__avatar" src="${avatarUrl}" alt="Avatar" /></a>
        <div class="friend-item__info">
          <div class="friend-item__name">${displayName}</div>
          <div class="friend-item__steamid">${friend.friend_steamid}</div>
        </div>
      </div>
      <div class="chat-content__item_right friend-actions">
        <span class="friend-action-btn friend-invite-btn" title="Send Invite"><img src="${this.icons.invite}" alt="Invite" /></span>
        <span class="friend-action-btn friend-edit-btn" title="Edit Nickname"><img src="${this.icons.edit}" alt="Edit" /></span>
        <span class="friend-action-btn friend-remove-btn" title="Remove"><img src="${this.icons.deleteFriend}" alt="Remove" /></span>
      </div>
    `;

    item.querySelector(".friend-invite-btn").onclick = (e) => {
      e.stopPropagation();
      this.sendInvite(friend.friend_steamid);
    };

    item.querySelector(".friend-edit-btn").onclick = (e) => {
      e.stopPropagation();
      const newNick = prompt("Enter new nickname:", friend.nickname || "");
      if (newNick !== null) {
        this.updateNickname(friend.friend_steamid, newNick);
      }
    };

    item.querySelector(".friend-remove-btn").onclick = (e) => {
      e.stopPropagation();
      this.removeFriend(friend.friend_steamid);
    };

    return item;
  },

  injectInviteButton: function (node) {
    if (node.querySelector(".invite-btn")) return;
    if (node.closest("#l4d2-friends-section")) return;

    const right = node.querySelector(".chat-content__item_right");
    if (!right) return;

    const link = node.querySelector('a[href*="steam_id="]');
    if (!link) return;

    const match = link.href.match(/steam_id=(\d+)/);
    if (!match) return;
    const targetSteamId = match[1];

    if (targetSteamId === this.currentUser) return;

    const isFriend = this.friends.some(
      (f) => f.friend_steamid === targetSteamId
    );

    const inviteBtn = document.createElement("span");
    inviteBtn.innerHTML = `<img src="${this.icons.invite}" alt="" /> Invite`;
    inviteBtn.className = "invite-btn";
    inviteBtn.title = "Send Invite";
    inviteBtn.onclick = (e) => {
      e.stopPropagation();
      this.sendInvite(targetSteamId);
    };
    right.insertBefore(inviteBtn, right.firstChild);

    if (!isFriend) {
      const friendBtn = document.createElement("span");
      friendBtn.innerHTML = `<img src="${this.icons.addFriend}" alt="Add Friend" />`;
      friendBtn.className = "add-friend-btn";
      friendBtn.title = "Add to Friends";
      friendBtn.onclick = (e) => {
        e.stopPropagation();
        this.addFriend(targetSteamId);
      };
      right.insertBefore(friendBtn, right.firstChild);
    }
  },

  waitForPartyCode: function (timeout = 3000) {
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        const el = document.getElementById("invitecodeoutput_inparty");
        if (el && el.value) {
          resolve(el.value);
        } else if (Date.now() - start > timeout) {
          resolve(null);
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  },
};

// Make global
window.L4D2Invitations = Invitations;

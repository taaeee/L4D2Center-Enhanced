import { createClient } from '@supabase/supabase-js';

const OBSCaster = {
  supabase: null,
  obsToken: null,
  channel: null,
  config: {
    url: "https://vctxtgacwuprmivvgclw.supabase.co",
    key: "sb_publishable_x6a3UfdTi8NpEyqFqhL31A_ZS5RCjfg",
  },
  lastBroadcastData: null,

  lastMmr: null,
  lastMmrChange: null,
  steamId: null,

  init: async function() {
    console.log("L4D2 Enhanced: OBSCaster initializing...");

    // Get or generate obsToken
    await this.initToken();

    this.supabase = createClient(this.config.url, this.config.key, {
      auth: { persistSession: false }
    });

    this.identifyUser();
    this.connectChannel();
    this.startMmrObserver();
    this.fetchLastMmrChange();

    // Re-broadcast periodically in case the overlay connects late
    setInterval(() => this.recast(), 5000);
  },

  identifyUser: function() {
    const links = document.querySelectorAll('a[href*="profile/?steam_id="]');
    for (let link of links) {
      const match = link.href.match(/steam_id=(\d+)/);
      if (match) {
        this.steamId = match[1];
        chrome.storage.local.set({ userSteamId: this.steamId });
        return this.steamId;
      }
    }
    return null;
  },

  fetchLastMmrChange: async function() {
    if (!this.steamId) this.identifyUser();
    if (!this.steamId || !this.supabase) return;

    try {
      const { data, error } = await this.supabase
        .from("match_history")
        .select("mmr_change")
        .eq("user_steamid", this.steamId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data && data.mmr_change !== undefined && data.mmr_change !== null) {
        this.lastMmrChange = data.mmr_change;
        if (this.lastMmr) {
          this.broadcastMessage("mmr_update", { mmr: this.lastMmr, mmrChange: this.lastMmrChange });
        }
      }
    } catch (e) {
      console.warn("L4D2 Enhanced: OBSCaster failed to fetch last MMR change:", e);
    }
  },

  startMmrObserver: function() {
    const observer = new MutationObserver(() => {
      this.broadcastMmr();
    });
    // Start observing immediately to catch when MMR element is injected or updated
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    // Also try immediately
    this.broadcastMmr();
  },

  initToken: function() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["obsToken"], (result) => {
        if (result.obsToken) {
          this.obsToken = result.obsToken;
          resolve(this.obsToken);
        } else {
          this.obsToken = crypto.randomUUID();
          chrome.storage.local.set({ obsToken: this.obsToken }, () => {
            resolve(this.obsToken);
          });
        }
      });
    });
  },

  connectChannel: function() {
    if (!this.obsToken) return;
    this.channel = this.supabase.channel(`obs_${this.obsToken}`);
    
    this.channel.on("broadcast", { event: "request_mmr" }, () => {
      if (this.lastMmr) {
        this.broadcastMessage("mmr_update", { mmr: this.lastMmr, mmrChange: this.lastMmrChange });
      }
    });

    this.channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log("L4D2 Enhanced: OBSCaster ready for broadcast on channel", `obs_${this.obsToken}`);
        // Send initial state if we have it
        if (this.lastBroadcastData) {
            this.broadcast(this.lastBroadcastData);
        } else {
            this.broadcast({ state: 'waiting' });
        }
        if (this.lastMmr) {
            this.broadcastMessage("mmr_update", { mmr: this.lastMmr, mmrChange: this.lastMmrChange });
        }
      }
    });
  },

  broadcastMessage: function(event, data) {
    if (!this.channel) return;
    if (event === 'match_update') {
      this.lastBroadcastData = data;
    }
    this.channel.send({
      type: 'broadcast',
      event: event,
      payload: data
    }).catch(err => console.warn("L4D2 Enhanced: Broadcast failed", err));
  },

  broadcast: function(data) {
    this.broadcastMessage('match_update', data);
  },

  broadcastMmr: function() {
    if (!this.steamId) this.identifyUser();

    // Buscar todos los elementos que coincidan por si el primero está vacío
    const mmrEls = document.querySelectorAll('.header__status, .personal [class*="mmr"], .personal-card [class*="mmr"]');
    
    if (mmrEls.length === 0) {
      // No elements found at all
      return;
    }

    // Buscar entre todos los elementos uno que tenga un número
    for (const el of mmrEls) {
      const text = el.textContent.replace(/,/g, '').trim();
      const numMatch = text.match(/\d+/);
      
      if (numMatch) {
        const currentMmr = numMatch[0];
        if (this.lastMmr !== currentMmr) {
          console.log("L4D2 Enhanced: OBSCaster detected new MMR:", currentMmr, "from element:", el);
          const hadPreviousMmr = (this.lastMmr !== null);
          this.lastMmr = currentMmr;
          if (hadPreviousMmr) {
            this.fetchLastMmrChange();
          } else {
            this.broadcastMessage("mmr_update", { mmr: currentMmr, mmrChange: this.lastMmrChange });
          }
        }
        return; // Salir apenas encontremos el válido
      }
    }
  },

  recast: function() {
    if (this.lastBroadcastData) {
      this.broadcast(this.lastBroadcastData);
    } else {
      this.broadcast({ state: "waiting" });
    }
    // Re-enviar el último MMR conocido de forma periódica
    if (this.lastMmr) {
      this.broadcastMessage("mmr_update", { mmr: this.lastMmr, mmrChange: this.lastMmrChange });
    } else {
      this.broadcastMmr();
    }
  },

  setWaitingState: function() {
    if (this.lastBroadcastData && this.lastBroadcastData.state !== 'waiting') {
      this.lastBroadcastData = { state: 'waiting' };
      this.broadcast(this.lastBroadcastData);
    }
  },

  captureAndBroadcast: function(panel) {
    console.log("L4D2 Enhanced: OBSCaster capturing panel...");
    // Determine map name
    let mapName = "Unknown";
    const mapImg = panel.querySelector(".match-panel__campaign img");
    let mapImageSrc = "";
    if (mapImg) {
      // Use absolute URL since OBS overlay is hosted externally
      const src = mapImg.src || mapImg.getAttribute("src") || "";
      mapImageSrc = src;
      const match = mapImg.getAttribute("src")?.match(/\/([^/]+)\.\w+$/);
      if (match) mapName = decodeURIComponent(match[1]);
    }

    const players = [];
    const teamContainers = [
      { selector: ".team-survivors .team__players li", team: "Survivors" },
      { selector: ".team-infected .team__players li", team: "Infected" },
      { selector: ".team__players li", team: "Unknown" } // Fallback si no tienen las clases de equipo específicas
    ];

    teamContainers.forEach(({ selector, team }) => {
      const playerNodes = panel.querySelectorAll(selector);
      playerNodes.forEach((li) => {
        // Find avatar
        let avatarUrl = "https://avatars.steamstatic.com/fef49e7fa7e1997310d705b2a6158ff8dc1cdfeb_medium.jpg";
        const imgEl = li.querySelector("img");
        if (imgEl && imgEl.src) avatarUrl = imgEl.src;

        // Player name
        const nameEl = li.querySelector(".player__name namestyle") || li.querySelector(".player__name");
        const playerName = nameEl ? nameEl.textContent.trim() : "";

        // MMR
        const mmrEl = li.querySelector(".lobby__block_status, .qm-badge, [class*='badge']");
        const mmr = mmrEl ? parseInt(mmrEl.textContent.replace(/,/g, '').trim(), 10) || 0 : 0;

        if (playerName) {
          // Avoid duplicates if fallback selector is used
          if (!players.find(p => p.playerName === playerName)) {
             players.push({ playerName, team, mmr, avatarUrl });
          }
        }
      });
    });

    console.log(`L4D2 Enhanced: OBSCaster extracted ${players.length} players. Map: ${mapName}`);

    if (players.length > 0) {
      const matchDataToCompare = {
        state: 'ingame',
        mapName,
        mapImageSrc,
        survivors: players.filter(p => p.team === "Survivors" || p.team === "Unknown"),
        infected: players.filter(p => p.team === "Infected")
      };

      // Remove timestamp from last broadcast for comparison
      let lastDataToCompare = null;
      if (this.lastBroadcastData) {
        const { timestamp, ...rest } = this.lastBroadcastData;
        lastDataToCompare = rest;
      }

      // Only broadcast if data actually changed to avoid spamming
      if (!lastDataToCompare || JSON.stringify(lastDataToCompare) !== JSON.stringify(matchDataToCompare)) {
        console.log("L4D2 Enhanced: OBSCaster broadcasting match data");
        this.broadcast({ ...matchDataToCompare, timestamp: Date.now() });
      }
    } else {
      console.warn("L4D2 Enhanced: OBSCaster found no players in the panel! HTML:", panel.innerHTML);
    }
  }
};

window.OBSCaster = OBSCaster;
export default OBSCaster;

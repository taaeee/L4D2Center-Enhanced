// L4D2 Center Enhanced - Match History Module
// Captures match results and saves them to Supabase

const MatchHistory = {
  supabase: null,
  currentUser: null,
  processedGameIds: new Set(),
  config: {
    url: "https://vctxtgacwuprmivvgclw.supabase.co",
    key: "sb_publishable_x6a3UfdTi8NpEyqFqhL31A_ZS5RCjfg",
  },

  init: function () {
    console.log("L4D2 Enhanced: MatchHistory initializing...");

    this.currentUser = this.identifyUser();
    if (!this.currentUser) {
      console.log("L4D2 Enhanced: MatchHistory - No user identified");
      return;
    }

    if (
      typeof window.supabase !== "undefined" &&
      window.supabase.createClient
    ) {
      this.supabase = window.supabase.createClient(
        this.config.url,
        this.config.key
      );
      console.log("L4D2 Enhanced: MatchHistory ready for user", this.currentUser);
    } else {
      console.warn("L4D2 Enhanced: MatchHistory - Supabase client not found");
    }
  },

  identifyUser: function () {
    const links = document.querySelectorAll('a[href*="profile/?steam_id="]');
    for (let link of links) {
      const match = link.href.match(/steam_id=(\d+)/);
      if (match) return match[1];
    }
    return null;
  },

  /**
   * Called when the match result panel (ingamerenderpanel) appears in the DOM.
   * Parses all match data and saves it to Supabase.
   */
  captureMatch: async function (panel) {
    if (!this.supabase || !this.currentUser) {
      // Try late init if user wasn't available at startup
      if (!this.currentUser) this.currentUser = this.identifyUser();
      if (!this.supabase && typeof window.supabase !== "undefined") {
        this.supabase = window.supabase.createClient(
          this.config.url,
          this.config.key
        );
      }
      if (!this.supabase || !this.currentUser) {
        console.warn("L4D2 Enhanced: MatchHistory - Cannot capture, not ready");
        return;
      }
    }

    try {
      const data = this.parseMatchPanel(panel);
      if (!data) return;

      // Skip if already processed in this session
      if (this.processedGameIds.has(data.gameId)) {
        console.log("L4D2 Enhanced: MatchHistory - Game already processed:", data.gameId);
        return;
      }
      this.processedGameIds.add(data.gameId);

      console.log("L4D2 Enhanced: MatchHistory - Captured match data:", data);
      await this.saveMatch(data);
    } catch (err) {
      console.error("L4D2 Enhanced: MatchHistory - Capture error:", err);
    }
  },

  /**
   * Parse the match panel DOM and extract all relevant data.
   */
  parseMatchPanel: function (panel) {
    // Game ID (required - used as dedup key)
    const footerStrong = panel.querySelector(".match-panel__footer strong");
    if (!footerStrong) {
      console.warn("L4D2 Enhanced: MatchHistory - No game ID found in panel");
      return null;
    }
    const gameId = footerStrong.textContent.trim();
    if (!gameId) return null;

    // Map name - extract from image src filename
    let mapName = "Unknown";
    const mapImg = panel.querySelector(".match-panel__campaign img");
    if (mapImg) {
      const src = mapImg.getAttribute("src") || "";
      // Extract filename without extension: "images/maps/Dead Center 2025.avif" → "Dead Center 2025"
      const match = src.match(/\/([^/]+)\.\w+$/);
      if (match) mapName = decodeURIComponent(match[1]);
    }

    // Config & Result from info blocks
    const infoBlocks = panel.querySelectorAll(".match-panel__info-block");
    let config = "";
    let result = "";
    if (infoBlocks.length >= 1) {
      const subtitle = infoBlocks[0].querySelector(".match-panel__subtitle");
      if (subtitle) config = subtitle.textContent.trim();
    }
    if (infoBlocks.length >= 2) {
      const subtitle = infoBlocks[1].querySelector(".match-panel__subtitle");
      if (subtitle) result = subtitle.textContent.trim();
    }

    // Scores - "3940 ‐ 3276"
    let scoreA = 0, scoreB = 0;
    const captions = panel.querySelectorAll(".list__caption");
    if (captions.length >= 1) {
      const scoreText = captions[0].textContent.trim();
      // Handle various dash characters: ‐ (U+2010), – (U+2013), - (U+002D), — (U+2014)
      const scoreParts = scoreText.split(/[\u2010\u2013\u002D\u2014]+/).map(s => s.trim());
      if (scoreParts.length === 2) {
        scoreA = parseInt(scoreParts[0], 10) || 0;
        scoreB = parseInt(scoreParts[1], 10) || 0;
      }
    }

    // MMR Change - "+33" or "-33"
    let mmrChange = 0;
    if (captions.length >= 2) {
      const mmrText = captions[1].textContent.trim();
      mmrChange = parseInt(mmrText, 10) || 0;
    }

    // Players
    const players = [];

    const teamContainers = [
      { selector: ".team-survivors .team__players li", team: "Survivors" },
      { selector: ".team-infected .team__players li", team: "Infected" },
    ];

    teamContainers.forEach(({ selector, team }) => {
      const playerNodes = panel.querySelectorAll(selector);
      playerNodes.forEach((li) => {
        const link = li.querySelector("a.player");
        if (!link) return;

        // SteamID from href
        const hrefMatch = link.getAttribute("href")?.match(/steam_id=(\d+)/);
        const steamId = hrefMatch ? hrefMatch[1] : "";

        // Player name
        const nameEl = li.querySelector(".player__name namestyle") || li.querySelector(".player__name");
        const playerName = nameEl ? nameEl.textContent.trim() : "";

        // MMR badge
        const mmrEl = li.querySelector(".lobby__block_status");
        const mmr = mmrEl ? parseInt(mmrEl.textContent.trim(), 10) || 0 : 0;

        if (steamId) {
          players.push({ steamId, playerName, team, mmr });
        }
      });
    });

    return {
      gameId,
      mapName,
      config,
      result,
      scoreA,
      scoreB,
      mmrChange,
      players,
    };
  },

  /**
   * Save match data to Supabase.
   */
  saveMatch: async function (data) {
    const { data: insertedMatch, error: matchError } = await this.supabase
      .from("match_history")
      .insert({
        user_steamid: this.currentUser,
        game_id: data.gameId,
        map_name: data.mapName,
        config: data.config,
        result: data.result,
        score_team_a: data.scoreA,
        score_team_b: data.scoreB,
        mmr_change: data.mmrChange,
      })
      .select("id")
      .single();

    if (matchError) {
      if (matchError.code === "23505") {
        console.log("L4D2 Enhanced: MatchHistory - Match already saved:", data.gameId);
        return;
      }
      console.error("L4D2 Enhanced: MatchHistory - Failed to save match:", matchError);
      return;
    }

    const matchId = insertedMatch.id;
    console.log("L4D2 Enhanced: MatchHistory - Match saved with ID:", matchId);

    if (data.players.length > 0) {
      const playerRows = data.players.map((p) => ({
        match_id: matchId,
        steam_id: p.steamId,
        player_name: p.playerName,
        team: p.team,
        mmr: p.mmr,
      }));

      const { error: playersError } = await this.supabase
        .from("match_players")
        .insert(playerRows);

      if (playersError) {
        console.error("L4D2 Enhanced: MatchHistory - Failed to save players:", playersError);
      } else {
        console.log(`L4D2 Enhanced: MatchHistory - Saved ${data.players.length} players`);
      }
    }
  },

  // ========== UI: MATCH HISTORY OVERLAY ==========

  HISTORY_PAGE_SIZE: 10,

  /**
   * Inject the "Match History" button into the page header nav.
   */
  injectHistoryButton: function () {
    if (document.getElementById("l4d2-history-btn")) return;

    const headerContainer =
      document.querySelector(".header__nav") ||
      document.querySelector(".header__right") ||
      document.querySelector(".header__wrap");
    if (!headerContainer) return;

    const btn = document.createElement("button");
    btn.id = "l4d2-history-btn";
    btn.type = "button";
    btn.title = "Match History";
    btn.className = "history-header-btn";
    btn.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor"><path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg> Match History`;

    btn.addEventListener("click", () => this.openHistoryOverlay());

    headerContainer.appendChild(btn);
    console.log("L4D2 Enhanced: MatchHistory button injected");
  },

  /**
   * Open the full-screen match history overlay.
   */
  openHistoryOverlay: async function () {
    if (document.getElementById("l4d2-history-overlay")) return;

    // Ensure Supabase client and user are available before opening
    if (!this.currentUser) this.currentUser = this.identifyUser();
    if (!this.supabase && typeof window.supabase !== "undefined" && window.supabase.createClient) {
      this.supabase = window.supabase.createClient(this.config.url, this.config.key);
    }

    const overlay = document.createElement("div");
    overlay.id = "l4d2-history-overlay";
    overlay.className = "mh-overlay";
    overlay.innerHTML = `
      <div class="mh-modal">
        <div class="mh-modal__header">
          <h2>📋 Match History</h2>
          <button class="mh-modal__close" id="mh-close-btn">✕</button>
        </div>
        <div class="mh-modal__summary" id="mh-summary">
          <div class="mh-summary__loading">Loading...</div>
        </div>
        <div class="mh-modal__body" id="mh-body">
          <div class="mh-loading">Loading match history...</div>
        </div>
        <div class="mh-modal__footer" id="mh-footer"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Close handlers
    document.getElementById("mh-close-btn").onclick = () => overlay.remove();
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });

    // Animate in
    requestAnimationFrame(() => overlay.classList.add("mh-overlay--open"));

    // Load data
    await this.loadHistory(0);
  },

  /**
   * Load match history from Supabase and render it.
   */
  loadHistory: async function (offset) {
    const body = document.getElementById("mh-body");
    const footer = document.getElementById("mh-footer");
    const summary = document.getElementById("mh-summary");
    if (!body) return;

    // Re-try init if needed
    if (!this.currentUser) this.currentUser = this.identifyUser();
    if (!this.supabase && typeof window.supabase !== "undefined" && window.supabase.createClient) {
      this.supabase = window.supabase.createClient(this.config.url, this.config.key);
    }

    if (!this.supabase || !this.currentUser) {
      body.innerHTML = `<div class="mh-error">Could not connect to database. Please reload the page and try again.</div>`;
      if (summary) summary.innerHTML = "";
      console.warn("L4D2 Enhanced: MatchHistory - supabase:", !!this.supabase, "user:", this.currentUser);
      return;
    }

    try {
      // Load matches with players
      const { data: matches, error, count } = await this.supabase
        .from("match_history")
        .select("*, match_players(*)", { count: "exact" })
        .eq("user_steamid", this.currentUser)
        .order("created_at", { ascending: false })
        .range(offset, offset + this.HISTORY_PAGE_SIZE - 1);

      if (error) {
        body.innerHTML = `<div class="mh-error">Error loading history: ${this.esc(error.message)}</div>`;
        return;
      }

      // Load MMR summary
      if (offset === 0) {
        await this.loadSummary(summary);
      }

      if (!matches || matches.length === 0) {
        if (offset === 0) {
          body.innerHTML = `<div class="mh-empty">No matches recorded yet. Play a game and the results will appear here!</div>`;
        }
        return;
      }

      // Render matches
      if (offset === 0) body.innerHTML = "";

      matches.forEach((match) => {
        const card = this.renderMatchCard(match);
        body.appendChild(card);
      });

      // Load more button
      footer.innerHTML = "";
      const totalLoaded = offset + matches.length;
      if (totalLoaded < count) {
        const loadMoreBtn = document.createElement("button");
        loadMoreBtn.className = "mh-load-more";
        loadMoreBtn.textContent = `Load more (${totalLoaded}/${count})`;
        loadMoreBtn.onclick = () => this.loadHistory(totalLoaded);
        footer.appendChild(loadMoreBtn);
      } else {
        footer.innerHTML = `<span class="mh-footer-text">${count} match${count !== 1 ? "es" : ""} total</span>`;
      }
    } catch (err) {
      body.innerHTML = `<div class="mh-error">Error: ${this.esc(err.message)}</div>`;
    }
  },

  /**
   * Load and render MMR summary stats.
   */
  loadSummary: async function (container) {
    if (!container) return;

    const { data, error } = await this.supabase
      .rpc("get_mmr_summary", { p_steamid: this.currentUser })
      .single();

    // If the RPC doesn't exist, fallback to client-side calculation
    if (error) {
      console.warn("L4D2 Enhanced: RPC not available, calculating client-side");
      const { data: allMatches } = await this.supabase
        .from("match_history")
        .select("mmr_change")
        .eq("user_steamid", this.currentUser);

      if (allMatches) {
        let gained = 0, lost = 0;
        allMatches.forEach((m) => {
          if (m.mmr_change > 0) gained += m.mmr_change;
          else lost += m.mmr_change;
        });
        const net = gained + lost;
        this.renderSummary(container, gained, lost, net, allMatches.length);
        return;
      }
      container.innerHTML = "";
      return;
    }

    if (data) {
      this.renderSummary(container, data.total_gained || 0, data.total_lost || 0, data.net_mmr || 0, data.total_matches || 0);
    }
  },

  renderSummary: function (container, gained, lost, net, totalMatches) {
    const netClass = net > 0 ? "mh-stat--positive" : net < 0 ? "mh-stat--negative" : "mh-stat--neutral";
    const netSign = net > 0 ? "+" : "";

    container.innerHTML = `
      <div class="mh-summary__grid">
        <div class="mh-stat">
          <span class="mh-stat__label">Games</span>
          <span class="mh-stat__value">${totalMatches}</span>
        </div>
        <div class="mh-stat">
          <span class="mh-stat__label">MMR Gained</span>
          <span class="mh-stat__value mh-stat--positive">+${gained}</span>
        </div>
        <div class="mh-stat">
          <span class="mh-stat__label">MMR Lost</span>
          <span class="mh-stat__value mh-stat--negative">${lost}</span>
        </div>
        <div class="mh-stat">
          <span class="mh-stat__label">Net MMR</span>
          <span class="mh-stat__value ${netClass}">${netSign}${net}</span>
        </div>
      </div>
    `;
  },

  /**
   * Render a single match card.
   */
  renderMatchCard: function (match) {
    const card = document.createElement("div");
    card.className = "mh-card";

    const isWin = match.result && (match.result.toLowerCase().includes("your team") || match.result.toLowerCase().includes("you won"));
    const isLoss = match.result && match.result.toLowerCase().includes("enemy");
    card.classList.toggle("mh-card--win", isWin);
    card.classList.toggle("mh-card--loss", isLoss);

    const mmrClass = match.mmr_change > 0 ? "mh-mmr--up" : match.mmr_change < 0 ? "mh-mmr--down" : "";
    const mmrSign = match.mmr_change > 0 ? "+" : "";
    const mmrIcon = match.mmr_change > 0 ? "▲" : match.mmr_change < 0 ? "▼" : "●";

    const dateStr = match.created_at
      ? new Date(match.created_at).toLocaleDateString("es-MX", {
          day: "numeric",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "";

    const survivors = (match.match_players || []).filter((p) => p.team === "Survivors");
    const infected = (match.match_players || []).filter((p) => p.team === "Infected");

    card.innerHTML = `
      <div class="mh-card__header">
        <div class="mh-card__map">
          <span class="mh-card__map-name">${this.esc(match.map_name || "Unknown")}</span>
          <span class="mh-card__config">${this.esc(match.config || "")}</span>
        </div>
        <div class="mh-card__result-info">
          <span class="mh-card__result">${this.esc(match.result || "")}</span>
          <span class="mh-card__date">${this.esc(dateStr)}</span>
        </div>
      </div>

      <div class="mh-card__scores">
        <div class="mh-card__score-block">
          <span class="mh-card__score-label">Score</span>
          <span class="mh-card__score-value">${match.score_team_a || 0} - ${match.score_team_b || 0}</span>
        </div>
        <div class="mh-card__mmr-block ${mmrClass}">
          <span class="mh-card__mmr-icon">${mmrIcon}</span>
          <span class="mh-card__mmr-value">${mmrSign}${match.mmr_change || 0} MMR</span>
        </div>
      </div>

      <div class="mh-card__teams">
        <div class="mh-card__team mh-card__team--survivors">
          <h5 class="mh-card__team-title"><span class="mh-team-dot mh-team-dot--blue"></span>Survivors</h5>
          <ul class="mh-card__players">
            ${survivors.map((p) => `
              <li>
                <a href="/profile/?steam_id=${this.esc(p.steam_id)}" target="_blank" class="mh-player-link">${this.esc(p.player_name || p.steam_id)}</a>
                <span class="mh-player-mmr">${p.mmr || "?"}</span>
              </li>
            `).join("")}
          </ul>
        </div>
        <div class="mh-card__team mh-card__team--infected">
          <h5 class="mh-card__team-title"><span class="mh-team-dot mh-team-dot--red"></span>Infected</h5>
          <ul class="mh-card__players">
            ${infected.map((p) => `
              <li>
                <a href="/profile/?steam_id=${this.esc(p.steam_id)}" target="_blank" class="mh-player-link">${this.esc(p.player_name || p.steam_id)}</a>
                <span class="mh-player-mmr">${p.mmr || "?"}</span>
              </li>
            `).join("")}
          </ul>
        </div>
      </div>

      <div class="mh-card__footer">
        <span class="mh-card__game-id">ID: ${this.esc(match.game_id || "")}</span>
      </div>
    `;

    return card;
  },

  /** HTML-escape helper */
  esc: function (str) {
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  },
};

// Make global
window.L4D2MatchHistory = MatchHistory;

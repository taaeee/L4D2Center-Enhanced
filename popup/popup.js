// L4D2 Center Enhanced - Popup Script

// Theme presets
const THEMES = {
  default: {
    bg: "#111318",
    top: "#1d2024",
    text: "#e1e2e8",
    border: "#44474f",
    accent1: "#a8c7fa",
    accent2: "#d3e3fd",
  },
  purple: {
    bg: "#141218",
    top: "#211f26",
    text: "#e6e0e9",
    border: "#49454f",
    accent1: "#d0bcff",
    accent2: "#e8def8",
  },
  blue: {
    bg: "#0f141a",
    top: "#1a1f26",
    text: "#e0e2e8",
    border: "#42474e",
    accent1: "#9ecaed",
    accent2: "#c2e7ff",
  },
  red: {
    bg: "#201a19",
    top: "#2c2220",
    text: "#ede0de",
    border: "#534341",
    accent1: "#ffb4ab",
    accent2: "#ffdad6",
  },
  green: {
    bg: "#121411",
    top: "#1a1c19",
    text: "#e3e3e0",
    border: "#424940",
    accent1: "#a8dab5",
    accent2: "#c4f7d1",
  },
};

document.addEventListener("DOMContentLoaded", () => {
  const autoReadyToggle = document.getElementById("autoReady");
  const streamerModeToggle = document.getElementById("streamerMode");
  const customThemeToggle = document.getElementById("customTheme");

  const colorInputs = {
    bg: document.getElementById("colorBg"),
    top: document.getElementById("colorTop"),
    text: document.getElementById("colorText"),
    border: document.getElementById("colorBorder"),
    accent1: document.getElementById("colorAccent1"),
    accent2: document.getElementById("colorAccent2"),
  };

  const themeButtons = document.querySelectorAll(".theme-btn");

  // Load saved settings
  chrome.storage.local.get(
    ["autoReady", "streamerMode", "customTheme", "themePreset", "themeColors"],
    (result) => {
      autoReadyToggle.checked = result.autoReady || false;
      streamerModeToggle.checked = result.streamerMode || false;
      customThemeToggle.checked = result.customTheme || false;

      // Load colors
      const colors = result.themeColors || THEMES.purple;
      colorInputs.bg.value = colors.bg;
      colorInputs.top.value = colors.top;
      colorInputs.text.value = colors.text;
      colorInputs.border.value = colors.border;
      colorInputs.accent1.value = colors.accent1;
      colorInputs.accent2.value = colors.accent2;

      // Highlight active preset
      const preset = result.themePreset || "default";
      themeButtons.forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.theme === preset);
      });
    }
  );

  // Save toggle settings
  autoReadyToggle.addEventListener("change", (e) => {
    chrome.storage.local.set({ autoReady: e.target.checked });
  });

  streamerModeToggle.addEventListener("change", (e) => {
    chrome.storage.local.set({ streamerMode: e.target.checked });
  });

  customThemeToggle.addEventListener("change", (e) => {
    chrome.storage.local.set({ customTheme: e.target.checked });
  });

  // Theme preset buttons
  themeButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const themeName = btn.dataset.theme;
      const theme = THEMES[themeName];

      if (theme) {
        // Update color inputs
        colorInputs.bg.value = theme.bg;
        colorInputs.top.value = theme.top;
        colorInputs.text.value = theme.text;
        colorInputs.border.value = theme.border;
        colorInputs.accent1.value = theme.accent1;
        colorInputs.accent2.value = theme.accent2;

        // Save to storage
        chrome.storage.local.set({
          themePreset: themeName,
          themeColors: theme,
        });

        // Update active button
        themeButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      }
    });
  });

  // Color picker changes
  Object.entries(colorInputs).forEach(([key, input]) => {
    input.addEventListener("change", () => {
      const colors = {
        bg: colorInputs.bg.value,
        top: colorInputs.top.value,
        text: colorInputs.text.value,
        border: colorInputs.border.value,
        accent1: colorInputs.accent1.value,
        accent2: colorInputs.accent2.value,
      };

      chrome.storage.local.set({
        themePreset: "custom",
        themeColors: colors,
      });

      // Clear active preset button
      themeButtons.forEach((b) => b.classList.remove("active"));
    });
  });

  // --- Saved Themes ---
  const savedThemesList = document.getElementById("savedThemesList");
  const saveThemeBtn = document.getElementById("saveThemeBtn");
  const exportThemeBtn = document.getElementById("exportThemeBtn");
  const importThemeBtn = document.getElementById("importThemeBtn");
  const themeActionStatus = document.getElementById("themeActionStatus");

  function getCurrentColors() {
    return {
      bg: colorInputs.bg.value,
      top: colorInputs.top.value,
      text: colorInputs.text.value,
      border: colorInputs.border.value,
      accent1: colorInputs.accent1.value,
      accent2: colorInputs.accent2.value,
    };
  }

  function applyColors(colors) {
    colorInputs.bg.value = colors.bg;
    colorInputs.top.value = colors.top;
    colorInputs.text.value = colors.text;
    colorInputs.border.value = colors.border;
    colorInputs.accent1.value = colors.accent1;
    colorInputs.accent2.value = colors.accent2;

    chrome.storage.local.set({
      themePreset: "custom",
      themeColors: colors,
    });

    themeButtons.forEach((b) => b.classList.remove("active"));
  }

  function showThemeStatus(text, color, duration = 2000) {
    themeActionStatus.textContent = text;
    themeActionStatus.style.color = color;
    if (duration > 0) {
      setTimeout(() => (themeActionStatus.textContent = ""), duration);
    }
  }

  function renderSavedThemes(themes) {
    savedThemesList.innerHTML = "";

    if (!themes || themes.length === 0) {
      savedThemesList.innerHTML =
        '<span style="font-size:10px;color:#888;font-style:italic;">No saved themes yet</span>';
      return;
    }

    themes.forEach((theme, index) => {
      const chip = document.createElement("div");
      chip.className = "saved-theme-chip";
      chip.title = `Apply "${theme.name}"`;

      // Color swatches preview
      const swatches = document.createElement("span");
      swatches.className = "chip-colors";
      ["accent1", "bg", "top"].forEach((key) => {
        const dot = document.createElement("span");
        dot.className = "chip-swatch";
        dot.style.backgroundColor = theme.colors[key];
        swatches.appendChild(dot);
      });

      const nameSpan = document.createElement("span");
      nameSpan.textContent = theme.name;

      const deleteBtn = document.createElement("span");
      deleteBtn.className = "chip-delete";
      deleteBtn.textContent = "×";
      deleteBtn.title = "Delete theme";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteSavedTheme(index);
      });

      chip.appendChild(swatches);
      chip.appendChild(nameSpan);
      chip.appendChild(deleteBtn);

      chip.addEventListener("click", () => {
        applyColors(theme.colors);
        showThemeStatus(`✓ Applied "${theme.name}"`, "#4caf50");
      });

      savedThemesList.appendChild(chip);
    });
  }

  function deleteSavedTheme(index) {
    chrome.storage.local.get(["savedThemes"], (result) => {
      const themes = result.savedThemes || [];
      const removed = themes.splice(index, 1);
      chrome.storage.local.set({ savedThemes: themes });
      renderSavedThemes(themes);
      showThemeStatus(`✓ Deleted "${removed[0]?.name}"`, "#ff4444");
    });
  }

  // Load saved themes on popup open
  chrome.storage.local.get(["savedThemes"], (result) => {
    renderSavedThemes(result.savedThemes || []);
  });

  // Save current theme
  saveThemeBtn.addEventListener("click", () => {
    const name = prompt("Theme name:");
    if (!name || !name.trim()) return;

    const colors = getCurrentColors();
    chrome.storage.local.get(["savedThemes"], (result) => {
      const themes = result.savedThemes || [];
      themes.push({ name: name.trim(), colors });
      chrome.storage.local.set({ savedThemes: themes });
      renderSavedThemes(themes);
      showThemeStatus(`✓ Saved "${name.trim()}"`, "#4caf50");
    });
  });

  // Export current theme as .json file download
  exportThemeBtn.addEventListener("click", () => {
    const colors = getCurrentColors();
    const json = JSON.stringify(colors, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "l4d2_theme.json";
    a.click();
    URL.revokeObjectURL(url);
    showThemeStatus("✓ Theme exported!", "#4caf50");
  });

  // Import theme from .json file
  importThemeBtn.addEventListener("click", () => {
    const fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = ".json";
    fileInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const colors = JSON.parse(evt.target.result);
          const requiredKeys = [
            "bg",
            "top",
            "text",
            "border",
            "accent1",
            "accent2",
          ];
          const hasAllKeys = requiredKeys.every(
            (k) => typeof colors[k] === "string"
          );

          if (!hasAllKeys) {
            showThemeStatus("✗ Invalid theme file", "#ff4444");
            return;
          }

          applyColors(colors);
          showThemeStatus(`✓ Imported from ${file.name}`, "#4caf50");
        } catch {
          showThemeStatus("✗ Invalid JSON file", "#ff4444");
        }
      };
      reader.readAsText(file);
    });
    fileInput.click();
  });

  // --- Anticheat Path ---
  const pathInput = document.getElementById("anticheatPath");
  const savePathBtn = document.getElementById("saveAnticheatPath");
  const browseBtn = document.getElementById("browseAnticheatPath");
  const pathStatus = document.getElementById("pathStatus");
  const launchBtn = document.getElementById("anticheatLogin");

  // Load saved path
  chrome.storage.local.get(["anticheatPath"], (result) => {
    if (result.anticheatPath) {
      pathInput.value = result.anticheatPath;
    }
  });

  // Save path
  savePathBtn.addEventListener("click", () => {
    const path = pathInput.value.trim();
    if (path) {
      chrome.storage.local.set({ anticheatPath: path });
      pathStatus.textContent = "✓ Path saved!";
      setTimeout(() => (pathStatus.textContent = ""), 2000);
    }
  });

  // Browse for .exe
  browseBtn.addEventListener("click", () => {
    browseBtn.disabled = true;
    browseBtn.textContent = "...";
    pathStatus.textContent = "Opening file dialog...";

    chrome.runtime.sendMessage({ type: "browseAnticheat" }, (response) => {
      browseBtn.disabled = false;
      browseBtn.textContent = "📁";

      if (response && response.success && response.path) {
        pathInput.value = response.path;
        // Auto-save the selected path
        chrome.storage.local.set({ anticheatPath: response.path });
        pathStatus.textContent = "✓ Path saved!";
        pathStatus.style.color = "var(--toggle-active)";
        setTimeout(() => (pathStatus.textContent = ""), 2000);
      } else if (response && response.error === "cancelled") {
        pathStatus.textContent = "";
      } else {
        pathStatus.textContent =
          "✗ " + (response ? response.error : "Native host not found");
        pathStatus.style.color = "#ff4444";
        setTimeout(() => {
          pathStatus.textContent = "";
          pathStatus.style.color = "var(--toggle-active)";
        }, 3000);
      }
    });
  });

  // Launch & Login button
  launchBtn.addEventListener("click", () => {
    launchBtn.disabled = true;
    launchBtn.textContent = "Launching...";

    chrome.runtime.sendMessage({ type: "launchAnticheat" }, (response) => {
      const launchOk = response && response.success;

      if (launchOk) {
        launchBtn.textContent = "Logging in...";
      } else {
        // Still try login — anticheat might already be running
        launchBtn.textContent = "Logging in...";
      }

      // Wait 3s for anticheat to start, then trigger login on l4d2center tab
      const delay = launchOk ? 3000 : 500;
      setTimeout(() => {
        chrome.tabs.query({ url: "https://l4d2center.com/*" }, (tabs) => {
          if (tabs && tabs.length > 0) {
            chrome.tabs.sendMessage(
              tabs[0].id,
              { type: "triggerLogin" },
              (loginResp) => {
                if (chrome.runtime.lastError || !loginResp) {
                  launchBtn.textContent = "✓ Launched! Login on site.";
                } else {
                  launchBtn.textContent = "✓ Done!";
                }
                setTimeout(() => {
                  launchBtn.disabled = false;
                  launchBtn.textContent = "Launch & Login";
                }, 3000);
              }
            );
          } else {
            launchBtn.textContent = launchOk
              ? "✓ Launched! Open l4d2center.com"
              : "Open l4d2center.com first";
            setTimeout(() => {
              launchBtn.disabled = false;
              launchBtn.textContent = "Launch & Login";
            }, 3000);
          }
        });
      }, delay);
    });
  });

  // --- Update Banner & Changelog ---
  const updateBanner = document.getElementById("updateBanner");
  const updateVersionEl = document.getElementById("updateVersion");
  const updateNotesEl = document.getElementById("updateNotes");
  const updateDownloadBtn = document.getElementById("updateDownloadBtn");
  const versionLink = document.getElementById("versionLink");
  const currentVersionEl = document.getElementById("currentVersion");
  const checkUpdateBtn = document.getElementById("checkUpdateBtn");
  const changelogOverlay = document.getElementById("changelogOverlay");
  const changelogClose = document.getElementById("changelogClose");
  const changelogBody = document.getElementById("changelogBody");

  // Set current version from manifest
  const manifestVersion = chrome.runtime.getManifest().version;
  currentVersionEl.textContent = manifestVersion;

  // Check for update banner
  let storedUpdateUrl = "";
  chrome.storage.local.get(
    [
      "updateAvailable",
      "updateVersion",
      "updateUrl",
      "updateNotes",
      "showWhatsNew",
    ],
    (result) => {
      if (result.updateAvailable && result.updateVersion) {
        storedUpdateUrl = result.updateUrl || "";
        updateVersionEl.textContent = `v${result.updateVersion}`;
        updateNotesEl.textContent = truncateNotes(result.updateNotes || "");
        updateBanner.classList.add("visible");
      }

      // What's New: auto-open changelog after extension update
      if (result.showWhatsNew) {
        chrome.storage.local.set({ showWhatsNew: false });
        openChangelog();
      }
    }
  );

  function truncateNotes(notes, maxLen = 200) {
    if (notes.length <= maxLen) return notes;
    return notes.substring(0, maxLen) + "…";
  }

  // Download button
  updateDownloadBtn.addEventListener("click", () => {
    if (storedUpdateUrl) {
      chrome.tabs.create({ url: storedUpdateUrl });
    }
  });

  // Check for updates manually
  checkUpdateBtn.addEventListener("click", () => {
    checkUpdateBtn.textContent = "Buscando...";
    checkUpdateBtn.disabled = true;

    chrome.runtime.sendMessage({ type: "checkForUpdate" }, (response) => {
      if (response && response.hasUpdate) {
        chrome.storage.local.get(
          ["updateVersion", "updateUrl", "updateNotes"],
          (data) => {
            storedUpdateUrl = data.updateUrl || "";
            updateVersionEl.textContent = `v${data.updateVersion}`;
            updateNotesEl.textContent = truncateNotes(data.updateNotes || "");
            updateBanner.classList.add("visible");
            checkUpdateBtn.textContent = "✓ Update found!";
            checkUpdateBtn.style.color = "#4caf50";
            checkUpdateBtn.style.borderColor = "#4caf50";
          }
        );
      } else {
        checkUpdateBtn.textContent = "✓ You're all up to date";
        checkUpdateBtn.style.color = "#4caf50";
        checkUpdateBtn.style.borderColor = "#4caf50";
      }

      setTimeout(() => {
        checkUpdateBtn.disabled = false;
        checkUpdateBtn.textContent = "Check for updates";
        checkUpdateBtn.style.color = "";
        checkUpdateBtn.style.borderColor = "";
      }, 3000);
    });
  });

  // Changelog modal
  versionLink.addEventListener("click", () => openChangelog());

  changelogClose.addEventListener("click", () => {
    changelogOverlay.classList.remove("visible");
  });

  changelogOverlay.addEventListener("click", (e) => {
    if (e.target === changelogOverlay) {
      changelogOverlay.classList.remove("visible");
    }
  });

  function openChangelog() {
    changelogOverlay.classList.add("visible");
    changelogBody.innerHTML =
      '<div class="changelog-loading">Loading changelog...</div>';

    chrome.runtime.sendMessage({ type: "getChangelog" }, (releases) => {
      if (!releases || releases.length === 0) {
        changelogBody.innerHTML =
          '<div class="changelog-empty">No releases available yet.</div>';
        return;
      }

      changelogBody.innerHTML = "";
      releases.forEach((release) => {
        const el = document.createElement("div");
        el.className = "changelog-release";

        const dateStr = release.date
          ? new Date(release.date).toLocaleDateString("es-MX", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "";

        el.innerHTML = `
          <div class="changelog-release-header">
            <span class="changelog-release-version">v${escapeHtml(
              release.version
            )}</span>
            <span class="changelog-release-date">${escapeHtml(dateStr)}</span>
          </div>
          ${
            release.name !== release.version
              ? `<div class="changelog-release-name">${escapeHtml(
                  release.name
                )}</div>`
              : ""
          }
          <div class="changelog-release-notes">${escapeHtml(
            release.notes || "No notes."
          )}</div>
        `;

        changelogBody.appendChild(el);
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
});

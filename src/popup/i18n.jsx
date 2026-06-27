import React, { createContext, useContext } from "react";
import { useChromeStorage } from "./hooks/useChromeStorage";

const translations = {
  es: {
    // Popup.jsx
    info: "Información",
    extensionId: "ID de Extensión",
    copyExtensionId: "Copiar ID de Extensión",
    features: "Funciones",
    autoReady: "Auto Ready",
    autoReadyDesc: 'Hace clic automáticamente en "Ready"',
    streamerMode: "Modo Streamer",
    streamerModeDesc: "Oculta los códigos de grupo",
    customTheme: "Tema personalizado",
    customThemeDesc: "Aplica colores personalizados a la página",

    // ThemeSettings.jsx
    themePresets: "Preajustes de tema",
    customColors: "Colores personalizados",
    presetDefault: "Predeterminado",
    presetPurple: "Morado",
    presetBlue: "Azul",
    presetRed: "Rojo",
    presetGreen: "Verde",
    bgLabel: "Fondo",
    topLabel: "Superior/Tarjetas",
    textLabel: "Texto",
    borderLabel: "Borde",
    accent1Label: "Acento 1",
    accent2Label: "Acento 2",
    playTextLabel: "Texto Jugar",

    // OBSSettings.jsx
    obsOverlay: "Overlay de OBS",
    panelPartida: "Panel de Partida",
    copyPanelPartida: "Copiar URL Panel Partida",
    panelMmr: "Panel de MMR",
    copyPanelMmr: "Copiar URL Panel MMR",
    regenToken: "Regenerar Token",
    regenTokenTitle: "Regenerar Token",
    regenConfirm:
      "¿Estás seguro de regenerar el token? Tendrás que actualizar las URLs en OBS.",

    // AnticheatSettings.jsx
    anticheat: "Anticheat",
    anticheatPath: "Ruta de Anticheat (.exe)",
    browseExe: "Buscar .exe",
    save: "Guardar",
    errBackground: "Error al conectar con el script en segundo plano.",
    pathSaved: "¡Ruta guardada correctamente!",
    noPath: "No se seleccionó ninguna ruta.",
    errPrefix: "Error: ",
    runHostNoteBefore: "Ejecuta ",
    runHostNoteAfter: " una vez para habilitar el lanzamiento.",

    // AvoidListSettings.jsx
    avoidList: "Lista de Avoids",
    avoidEmpty: "No hay jugadores en la lista de Avoids.",
    remove: "Eliminar",

    // UpdaterSettings.jsx
    updateAvailable: "¡Actualización disponible!",
    version: "Versión ",
    downloadUpdate: "Descargar actualización",
    checking: "Buscando...",
    updateFound: "¡Actualización encontrada!",
    latestVersion: "Tienes la última versión.",
    checkUpdates: "Buscar actualizaciones",
  },
  en: {
    // Popup.jsx
    info: "Info",
    extensionId: "Extension ID",
    copyExtensionId: "Copy Extension ID",
    features: "Features",
    autoReady: "Auto Ready",
    autoReadyDesc: 'Automatically clicks "Ready" in lobby',
    streamerMode: "Streamer Mode",
    streamerModeDesc: "Hides party codes",
    customTheme: "Custom Theme",
    customThemeDesc: "Apply custom colors to page",

    // ThemeSettings.jsx
    themePresets: "Theme Presets",
    customColors: "Custom Colors",
    presetDefault: "Default",
    presetPurple: "Purple",
    presetBlue: "Blue",
    presetRed: "Red",
    presetGreen: "Green",
    bgLabel: "Background",
    topLabel: "Top/Cards",
    textLabel: "Text",
    borderLabel: "Border",
    accent1Label: "Accent 1",
    accent2Label: "Accent 2",
    playTextLabel: "Play Text",

    // OBSSettings.jsx
    obsOverlay: "OBS Overlay",
    panelPartida: "Match Panel",
    copyPanelPartida: "Copy Match Panel URL",
    panelMmr: "MMR Panel",
    copyPanelMmr: "Copy MMR Panel URL",
    regenToken: "Regen Token",
    regenTokenTitle: "Regenerate Token",
    regenConfirm:
      "Are you sure you want to regenerate the token? You will need to update the URLs in OBS.",

    // AnticheatSettings.jsx
    anticheat: "Anticheat",
    anticheatPath: "Anticheat Path (.exe)",
    browseExe: "Browse for .exe",
    save: "Save",
    errBackground: "Error connecting to background script.",
    pathSaved: "Path saved successfully!",
    noPath: "No path selected.",
    errPrefix: "Error: ",
    runHostNoteBefore: "Run ",
    runHostNoteAfter: " once to enable launch.",

    // AvoidListSettings.jsx
    avoidList: "Avoid List",
    avoidEmpty: "No players in avoid list.",
    remove: "Remove",

    // UpdaterSettings.jsx
    updateAvailable: "Update Available!",
    version: "Version ",
    downloadUpdate: "Download Update",
    checking: "Checking...",
    updateFound: "Update found!",
    latestVersion: "You have the latest version.",
    checkUpdates: "Check for updates",
  },
};

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useChromeStorage("popupLang", "es");

  const currentLang = lang || "es";

  const t = (key) => {
    return translations[currentLang]?.[key] || translations.es[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang: currentLang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}

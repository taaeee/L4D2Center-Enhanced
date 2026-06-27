import React from 'react';
import { useChromeStorage } from '../hooks/useChromeStorage';
import { useTranslation } from '../i18n';

const THEMES = {
  default: { bg: "#111318", top: "#1d2024", text: "#e1e2e8", border: "#44474f", accent1: "#a8c7fa", accent2: "#d3e3fd", playText: "#062e6f" },
  purple: { bg: "#141218", top: "#211f26", text: "#e6e0e9", border: "#49454f", accent1: "#d0bcff", accent2: "#e8def8", playText: "#381e72" },
  blue: { bg: "#0f141a", top: "#1a1f26", text: "#e0e2e8", border: "#42474e", accent1: "#9ecaed", accent2: "#c2e7ff", playText: "#00325b" },
  red: { bg: "#201a19", top: "#2c2220", text: "#ede0de", border: "#534341", accent1: "#ffb4ab", accent2: "#ffdad6", playText: "#410002" },
  green: { bg: "#121411", top: "#1a1c19", text: "#e3e3e0", border: "#424940", accent1: "#a8dab5", accent2: "#c4f7d1", playText: "#00391c" },
};

export default function ThemeSettings() {
  const { t } = useTranslation();
  const [themePreset, setThemePreset] = useChromeStorage('themePreset', 'default');
  const [themeColors, setThemeColors] = useChromeStorage('themeColors', THEMES.default);

  const handlePresetClick = (preset) => {
    setThemePreset(preset);
    setThemeColors(THEMES[preset]);
  };

  const handleColorChange = (key, value) => {
    setThemePreset('custom');
    setThemeColors({ ...themeColors, [key]: value });
  };

  const presetNames = {
    default: t("presetDefault"),
    purple: t("presetPurple"),
    blue: t("presetBlue"),
    red: t("presetRed"),
    green: t("presetGreen"),
  };

  return (
    <>
      <div className="section-header text-red-500 font-bold">{t("themePresets")}</div>
      <div className="theme-presets">
        {Object.keys(THEMES).map(preset => (
          <button 
            key={preset}
            data-theme={preset}
            className={`theme-btn ${themePreset === preset ? 'active' : ''}`}
            onClick={() => handlePresetClick(preset)}
          >
            {presetNames[preset] || preset}
          </button>
        ))}
      </div>

      <div className="section-header">{t("customColors")}</div>
      <div className="settings-list">
        <div className="color-row">
          <div className="color-item">
            <label>{t("bgLabel")}</label>
            <input type="color" className="color-picker" value={themeColors.bg} onChange={(e) => handleColorChange('bg', e.target.value)} />
          </div>
          <div className="color-item">
            <label>{t("topLabel")}</label>
            <input type="color" className="color-picker" value={themeColors.top} onChange={(e) => handleColorChange('top', e.target.value)} />
          </div>
        </div>
        <div className="color-row">
          <div className="color-item">
            <label>{t("textLabel")}</label>
            <input type="color" className="color-picker" value={themeColors.text} onChange={(e) => handleColorChange('text', e.target.value)} />
          </div>
          <div className="color-item">
            <label>{t("borderLabel")}</label>
            <input type="color" className="color-picker" value={themeColors.border} onChange={(e) => handleColorChange('border', e.target.value)} />
          </div>
        </div>
        <div className="color-row">
          <div className="color-item">
            <label>{t("accent1Label")}</label>
            <input type="color" className="color-picker" value={themeColors.accent1} onChange={(e) => handleColorChange('accent1', e.target.value)} />
          </div>
          <div className="color-item">
            <label>{t("accent2Label")}</label>
            <input type="color" className="color-picker" value={themeColors.accent2} onChange={(e) => handleColorChange('accent2', e.target.value)} />
          </div>
        </div>
        <div className="color-row">
          <div className="color-item" style={{ gridColumn: '1 / -1' }}>
            <label>{t("playTextLabel")}</label>
            <input type="color" className="color-picker" value={themeColors.playText || '#062e6f'} onChange={(e) => handleColorChange('playText', e.target.value)} />
          </div>
        </div>
      </div>
    </>
  );
}


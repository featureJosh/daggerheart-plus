import { MODULE_ID } from "./constants.js";
import { applyCurrencyVisibility, applySystemCurrencyVisibility, applyCurrencyIcons, applyCurrencyLabels, applyThemeColorsToSheet } from "./style-toggles.js";

export function registerUiHooks() {
  Hooks.on("getHeaderControlsApplicationV2", (app, controls) => {
    if (app?.constructor?.name !== "DaggerheartPlusCharacterSheet") return;
    let seenViewLevelups = false;
    for (let i = controls.length - 1; i >= 0; i--) {
      if (controls[i]?.action === "viewLevelups") {
        if (seenViewLevelups) controls.splice(i, 1);
        else seenViewLevelups = true;
      }
    }
  });

  Hooks.on("renderApplicationV2", (app, element, data) => {
    if (!app.constructor.name.startsWith("DaggerheartPlus")) return;
    
    console.log(`Daggerheart Plus | Rendering ${app.constructor.name}`);

    try {
      if (app.element) applyThemeColorsToSheet(app.element);
    } catch (_) {}

    try {
      const actor = app.document;
      if (actor && app.element) {
        window.daggerheartPlus?.bindProgressBarClicks?.(app.element, actor);
      }
    } catch (_) {}

    try {
      const currencyEnabled = game.settings.get(MODULE_ID, "enableCurrency");
      applyCurrencyVisibility(currencyEnabled);
      applySystemCurrencyVisibility();
      applyCurrencyIcons();
      applyCurrencyLabels();
    } catch (_) {}

    if (app.constructor.name === "DaggerheartPlusCompanionSheet") {
      try {
        if (app.options) app.options.resizable = false;
        const el = app.element;
        if (el) {
          el.classList?.remove?.("resizable");
          const handles = el.querySelectorAll(
            ".resizable, .app-resizable, .window-resizable, .resize-handle"
          );
          handles.forEach((h) => h.remove?.());
        }
      } catch (_) {}
    }
  });

  Hooks.on("closeActorSheet", async (app) => {
    if (app?.constructor?.name !== "DaggerheartPlusCharacterSheet") return;
    try {
      app._removeInlineRails?.();
    } catch {}
  });

  Hooks.on("updateSetting", (setting, changes, options, userId) => {
    if (setting.key === 'daggerheart.Homebrew') {
      try {
        applyCurrencyLabels();
        applySystemCurrencyVisibility();
      } catch (e) {
        console.warn("Daggerheart Plus | Failed to apply currency labels on system setting change", e);
      }
    }
  });
}

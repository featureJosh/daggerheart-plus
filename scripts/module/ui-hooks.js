import { MODULE_ID } from "./constants.js";
import { applyCurrencyVisibility, applyCurrencyIcons, applyThemeColorsToSheet } from "./style-toggles.js";

export function registerUiHooks() {
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
      applyCurrencyIcons();
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
}

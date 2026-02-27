import { MODULE_ID, COLOR_SETTINGS } from "./constants.js";
import { applyEffectsHaloSetting, applyEffectsHaloIconSize, applyEffectsHaloSpacing } from "./effects-halo.js";
import { applyTooltipCardMaxWidth } from "./tooltip-manager.js";
import { applyEnhancedChatStyles, applyParticleEffects, applyCriticalHitParticles, applyTokenCountersVisibilityBySetting, applyDomainCardOpenSetting, applyCurrencyVisibility, applySystemCurrencyVisibility, applyCurrencyIcons, applyCurrencyLabels, applyThemeColors, applyCustomFont } from "./style-toggles.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

class ThemeColorsConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "dhp-theme-colors-config",
    tag: "form",
    window: {
      title: "DHP.Settings.ThemeColors.Title",
      icon: "fas fa-palette",
    },
    position: {
      width: 420,
      height: "auto",
    },
    form: {
      handler: ThemeColorsConfig.#onSubmit,
      closeOnSubmit: true,
    },
    actions: {
      resetColor: ThemeColorsConfig.#onResetColor,
      resetAll: ThemeColorsConfig.#onResetAll,
    },
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/applications/theme-colors-config.hbs`,
    },
  };

  async _prepareContext(options) {
    const colors = COLOR_SETTINGS.map((c) => ({
      key: c.key,
      label: game.i18n?.localize?.(`DHP.Settings.ThemeColors.${c.key}`) || c.key,
      value: game.settings.get(MODULE_ID, c.key),
      default: c.default,
    }));
    return { colors };
  }

  _onRender(context, options) {
    ThemeColorsConfig.#bindColorSync(this.element);
  }

  static #bindColorSync(element) {
    element.querySelectorAll("input[type='color']").forEach((colorInput) => {
      const hexInput = element.querySelector(`.hex-input[data-for="${colorInput.name}"]`);
      if (!hexInput) return;
      colorInput.addEventListener("input", () => {
        hexInput.value = colorInput.value;
      });
      hexInput.addEventListener("input", () => {
        if (/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) {
          colorInput.value = hexInput.value;
        }
      });
    });
  }

  static async #onSubmit(event, form, formData) {
    for (const c of COLOR_SETTINGS) {
      const val = formData.object[c.key];
      if (val) await game.settings.set(MODULE_ID, c.key, val);
    }
    applyThemeColors();
  }

  static #onResetColor(event, target) {
    const key = target.dataset.key;
    const def = COLOR_SETTINGS.find((c) => c.key === key)?.default;
    if (def) {
      const colorInput = this.element.querySelector(`input[name="${key}"]`);
      const hexInput = this.element.querySelector(`.hex-input[data-for="${key}"]`);
      if (colorInput) colorInput.value = def;
      if (hexInput) hexInput.value = def;
    }
  }

  static #onResetAll(event, target) {
    for (const c of COLOR_SETTINGS) {
      const colorInput = this.element.querySelector(`input[name="${c.key}"]`);
      const hexInput = this.element.querySelector(`.hex-input[data-for="${c.key}"]`);
      if (colorInput) colorInput.value = c.default;
      if (hexInput) hexInput.value = c.default;
    }
  }
}

class UIElementsConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "dhp-ui-elements-config",
    tag: "form",
    window: {
      title: "DHP.Settings.UIElements.Title",
      icon: "fas fa-window-maximize",
    },
    position: {
      width: 450,
      height: "auto",
    },
    form: {
      handler: UIElementsConfig.#onSubmit,
      closeOnSubmit: true,
    },
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/applications/ui-elements-config.hbs`,
    },
  };

  async _prepareContext(options) {
    return {
      enableFearTracker: game.settings.get(MODULE_ID, "enableFearTracker"),
      fearTrackerPosition: game.settings.get(MODULE_ID, "fearTrackerPosition"),
      fearTrackerStyle: game.settings.get(MODULE_ID, "fearTrackerStyle"),
      enableTokenCounters: game.settings.get(MODULE_ID, "enableTokenCounters"),
      enableCharacterSheetSidebars: game.settings.get(MODULE_ID, "enableCharacterSheetSidebars"),
      tooltipCardMaxWidth: game.settings.get(MODULE_ID, "tooltipCardMaxWidth"),
      alwaysShowLoadoutResourceCounters: game.settings.get(MODULE_ID, "alwaysShowLoadoutResourceCounters"),
      enableResourcePips: game.settings.get(MODULE_ID, "enableResourcePips"),
    };
  }

  static async #onSubmit(event, form, formData) {
    const data = formData.object;
    await game.settings.set(MODULE_ID, "enableFearTracker", data.enableFearTracker ?? false);
    await game.settings.set(MODULE_ID, "fearTrackerPosition", data.fearTrackerPosition ?? "bottom");
    await game.settings.set(MODULE_ID, "fearTrackerStyle", data.fearTrackerStyle ?? "counter");
    await game.settings.set(MODULE_ID, "enableTokenCounters", data.enableTokenCounters ?? false);
    await game.settings.set(MODULE_ID, "enableCharacterSheetSidebars", data.enableCharacterSheetSidebars ?? false);
    await game.settings.set(MODULE_ID, "tooltipCardMaxWidth", data.tooltipCardMaxWidth ?? 304);
    await game.settings.set(MODULE_ID, "alwaysShowLoadoutResourceCounters", data.alwaysShowLoadoutResourceCounters ?? false);
    await game.settings.set(MODULE_ID, "enableResourcePips", data.enableResourcePips ?? false);
  }
}

class TokenEffectsConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "dhp-token-effects-config",
    tag: "form",
    window: {
      title: "DHP.Settings.TokenEffects.Title",
      icon: "fas fa-sparkles",
    },
    position: {
      width: 400,
      height: "auto",
    },
    form: {
      handler: TokenEffectsConfig.#onSubmit,
      closeOnSubmit: true,
    },
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/applications/token-effects-config.hbs`,
    },
  };

  async _prepareContext(options) {
    return {
      enableEffectsHalo: game.settings.get(MODULE_ID, "enableEffectsHalo"),
      effectsHaloIconSize: game.settings.get(MODULE_ID, "effectsHaloIconSize"),
      effectsHaloSpacing: game.settings.get(MODULE_ID, "effectsHaloSpacing"),
    };
  }

  static async #onSubmit(event, form, formData) {
    const data = formData.object;
    await game.settings.set(MODULE_ID, "enableEffectsHalo", data.enableEffectsHalo ?? true);
    await game.settings.set(MODULE_ID, "effectsHaloIconSize", data.effectsHaloIconSize ?? 18);
    await game.settings.set(MODULE_ID, "effectsHaloSpacing", data.effectsHaloSpacing ?? 0.85);
  }
}

class ChatEffectsConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "dhp-chat-effects-config",
    tag: "form",
    window: {
      title: "DHP.Settings.ChatEffects.Title",
      icon: "fas fa-comments",
    },
    position: {
      width: 400,
      height: "auto",
    },
    form: {
      handler: ChatEffectsConfig.#onSubmit,
      closeOnSubmit: true,
    },
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/applications/chat-effects-config.hbs`,
    },
  };

  async _prepareContext(options) {
    return {
      enableEnhancedChat: game.settings.get(MODULE_ID, "enableEnhancedChat"),
      enableParticles: game.settings.get(MODULE_ID, "enableParticles"),
      alwaysOpenDomainCards: game.settings.get(MODULE_ID, "alwaysOpenDomainCards"),
    };
  }

  static async #onSubmit(event, form, formData) {
    const data = formData.object;
    await game.settings.set(MODULE_ID, "enableEnhancedChat", data.enableEnhancedChat ?? true);
    await game.settings.set(MODULE_ID, "enableParticles", data.enableParticles ?? true);
    await game.settings.set(MODULE_ID, "alwaysOpenDomainCards", data.alwaysOpenDomainCards ?? false);
  }
}

class CurrencyConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "dhp-currency-config",
    tag: "form",
    window: {
      title: "DHP.Settings.Currency.Title",
      icon: "fas fa-coins",
    },
    position: {
      width: 450,
      height: "auto",
    },
    form: {
      handler: CurrencyConfig.#onSubmit,
      closeOnSubmit: true,
    },
    actions: {
      filePicker: CurrencyConfig.#onFilePicker,
    },
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/applications/currency-config.hbs`,
    },
  };

  async _prepareContext(options) {
    return {
      enableCurrency: game.settings.get(MODULE_ID, "enableCurrency"),
      currencyIconCoins: game.settings.get(MODULE_ID, "currencyIconCoins"),
      currencyIconHandfuls: game.settings.get(MODULE_ID, "currencyIconHandfuls"),
      currencyIconBags: game.settings.get(MODULE_ID, "currencyIconBags"),
      currencyIconChests: game.settings.get(MODULE_ID, "currencyIconChests"),
    };
  }

  static async #onSubmit(event, form, formData) {
    const data = formData.object;
    await game.settings.set(MODULE_ID, "enableCurrency", data.enableCurrency ?? true);
    await game.settings.set(MODULE_ID, "currencyIconCoins", data.currencyIconCoins ?? "");
    await game.settings.set(MODULE_ID, "currencyIconHandfuls", data.currencyIconHandfuls ?? "");
    await game.settings.set(MODULE_ID, "currencyIconBags", data.currencyIconBags ?? "");
    await game.settings.set(MODULE_ID, "currencyIconChests", data.currencyIconChests ?? "");
  }

  static async #onFilePicker(event, target) {
    const field = target.dataset.field;
    const input = this.element.querySelector(`input[name="${field}"]`);
    const fp = new FilePicker({
      type: "image",
      current: input?.value || "",
      callback: (path) => {
        if (input) input.value = path;
      },
    });
    fp.browse();
  }
}

class SheetDimensionsConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "dhp-sheet-dimensions-config",
    tag: "form",
    window: {
      title: "DHP.Settings.SheetDimensions.Title",
      icon: "fas fa-expand",
    },
    position: {
      width: 400,
      height: "auto",
    },
    form: {
      handler: SheetDimensionsConfig.#onSubmit,
      closeOnSubmit: true,
    },
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/applications/sheet-dimensions-config.hbs`,
    },
  };

  async _prepareContext(options) {
    return {
      defaultSheetWidth: game.settings.get(MODULE_ID, "defaultSheetWidth"),
      defaultSheetHeight: game.settings.get(MODULE_ID, "defaultSheetHeight"),
      adversarySheetWidth: game.settings.get(MODULE_ID, "adversarySheetWidth"),
      adversarySheetHeight: game.settings.get(MODULE_ID, "adversarySheetHeight"),
    };
  }

  static async #onSubmit(event, form, formData) {
    const data = formData.object;
    await game.settings.set(MODULE_ID, "defaultSheetWidth", data.defaultSheetWidth ?? 900);
    await game.settings.set(MODULE_ID, "defaultSheetHeight", data.defaultSheetHeight ?? 800);
    await game.settings.set(MODULE_ID, "adversarySheetWidth", data.adversarySheetWidth ?? 750);
    await game.settings.set(MODULE_ID, "adversarySheetHeight", data.adversarySheetHeight ?? 820);
  }
}

class ProgressGradientsConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "dhp-progress-gradients-config",
    tag: "form",
    window: {
      title: "DHP.Settings.ProgressGradients.Title",
      icon: "fas fa-fill-drip",
    },
    position: {
      width: 420,
      height: "auto",
    },
    form: {
      handler: ProgressGradientsConfig.#onSubmit,
      closeOnSubmit: true,
    },
    actions: {
      addColor: ProgressGradientsConfig.#onAddColor,
      removeColor: ProgressGradientsConfig.#onRemoveColor,
      resetAll: ProgressGradientsConfig.#onResetAll,
    },
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/applications/progress-gradients-config.hbs`,
    },
  };

  static #parseColorString(str) {
    if (!str || typeof str !== "string") return [];
    return str.split(/[\s,]+/).map(s => s.trim()).filter(c => /^#([0-9a-fA-F]{6})$/.test(c));
  }

  async _prepareContext(options) {
    const hpStr = game.settings.get(MODULE_ID, "hpGradient") || "";
    const stressStr = game.settings.get(MODULE_ID, "stressGradient") || "";
    const armorStr = game.settings.get(MODULE_ID, "armorGradient") || "";
    return {
      hpColors: ProgressGradientsConfig.#parseColorString(hpStr),
      stressColors: ProgressGradientsConfig.#parseColorString(stressStr),
      armorColors: ProgressGradientsConfig.#parseColorString(armorStr),
    };
  }

  _onRender(context, options) {
    ProgressGradientsConfig.#bindColorSync(this.element);
  }

  static #bindColorSync(element) {
    element.querySelectorAll("input[type='color']").forEach((colorInput) => {
      const hexInput = element.querySelector(`.hex-input[data-for="${colorInput.name}"]`);
      if (!hexInput) return;
      colorInput.addEventListener("input", () => {
        hexInput.value = colorInput.value;
      });
      hexInput.addEventListener("input", () => {
        if (/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) {
          colorInput.value = hexInput.value;
        }
      });
    });
  }

  static #collectColors(form, prefix) {
    const colors = [];
    let i = 0;
    while (true) {
      const input = form.querySelector(`input[name="${prefix}-${i}"]`);
      if (!input) break;
      if (input.value) colors.push(input.value);
      i++;
    }
    return colors.join(", ");
  }

  static async #onSubmit(event, form, formData) {
    const hpGradient = ProgressGradientsConfig.#collectColors(form, "hp");
    const stressGradient = ProgressGradientsConfig.#collectColors(form, "stress");
    const armorGradient = ProgressGradientsConfig.#collectColors(form, "armor");
    await game.settings.set(MODULE_ID, "hpGradient", hpGradient);
    await game.settings.set(MODULE_ID, "stressGradient", stressGradient);
    await game.settings.set(MODULE_ID, "armorGradient", armorGradient);
  }

  static #onAddColor(event, target) {
    const gradient = target.dataset.gradient;
    const grid = target.previousElementSibling;
    const count = grid.querySelectorAll(".color-row").length;
    const row = document.createElement("div");
    row.className = "color-row";
    row.innerHTML = `
      <div class="color-input-wrapper">
        <input type="text" class="hex-input" data-for="${gradient}-${count}" value="#888888" maxlength="7" />
        <input type="color" name="${gradient}-${count}" value="#888888" />
        <button type="button" data-action="removeColor" data-gradient="${gradient}" data-index="${count}" title="Remove">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    grid.appendChild(row);
    const colorInput = row.querySelector("input[type='color']");
    const hexInput = row.querySelector(".hex-input");
    colorInput.addEventListener("input", () => {
      hexInput.value = colorInput.value;
    });
    hexInput.addEventListener("input", () => {
      if (/^#[0-9a-fA-F]{6}$/.test(hexInput.value)) {
        colorInput.value = hexInput.value;
      }
    });
    row.querySelector("button").addEventListener("click", (e) => {
      row.remove();
    });
  }

  static #onRemoveColor(event, target) {
    const row = target.closest(".color-row");
    if (row) row.remove();
  }

  static #onResetAll(event, target) {
    const form = this.element;
    form.querySelectorAll(".color-grid").forEach(grid => {
      grid.innerHTML = "";
    });
  }
}

class CustomFontConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "dhp-custom-font-config",
    tag: "form",
    window: {
      title: "DHP.Settings.CustomFont.Title",
      icon: "fas fa-font",
    },
    position: {
      width: 450,
      height: "auto",
    },
    form: {
      handler: CustomFontConfig.#onSubmit,
      closeOnSubmit: true,
    },
    actions: {
      filePicker: CustomFontConfig.#onFilePicker,
      clearFont: CustomFontConfig.#onClearFont,
    },
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/applications/custom-font-config.hbs`,
    },
  };

  async _prepareContext(options) {
    return {
      customFontFile: game.settings.get(MODULE_ID, "customFontFile"),
    };
  }

  static async #onSubmit(event, form, formData) {
    const data = formData.object;
    await game.settings.set(MODULE_ID, "customFontFile", data.customFontFile ?? "");
  }

  static async #onFilePicker(event, target) {
    const input = this.element.querySelector(`input[name="customFontFile"]`);
    const fp = new FilePicker({
      type: "font",
      current: input?.value || "",
      callback: (path) => {
        if (input) input.value = path;
      },
    });
    fp.browse();
  }

  static #onClearFont(event, target) {
    const input = this.element.querySelector(`input[name="customFontFile"]`);
    if (input) input.value = "";
  }
}

class HoverDistanceConfig extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "dhp-hover-distance-config",
    tag: "form",
    window: {
      title: "DHP.Settings.HoverDistance.Title",
      icon: "fas fa-ruler",
    },
    position: {
      width: 400,
      height: "auto",
    },
    form: {
      handler: HoverDistanceConfig.#onSubmit,
      closeOnSubmit: true,
    },
  };

  static PARTS = {
    form: {
      template: `modules/${MODULE_ID}/templates/applications/hover-distance-config.hbs`,
    },
  };

  async _prepareContext(options) {
    return {
      enableHoverDistance: game.settings.get(MODULE_ID, "enableHoverDistance"),
      hoverDistancePosition: game.settings.get(MODULE_ID, "hoverDistancePosition"),
      hoverDistanceRounding: game.settings.get(MODULE_ID, "hoverDistanceRounding"),
      hoverDistanceEdgeToEdge: game.settings.get(MODULE_ID, "hoverDistanceEdgeToEdge"),
    };
  }

  static async #onSubmit(event, form, formData) {
    const data = formData.object;
    await game.settings.set(MODULE_ID, "enableHoverDistance", data.enableHoverDistance ?? true);
    await game.settings.set(MODULE_ID, "hoverDistancePosition", data.hoverDistancePosition ?? "center");
    await game.settings.set(MODULE_ID, "hoverDistanceRounding", data.hoverDistanceRounding ?? 0);
    await game.settings.set(MODULE_ID, "hoverDistanceEdgeToEdge", data.hoverDistanceEdgeToEdge ?? false);
  }
}

export function registerModuleSettings() {

  game.settings.registerMenu(MODULE_ID, "themeColorsMenu", {
    name: "DHP.Settings.ThemeColors.Menu.Name",
    label: "DHP.Settings.ThemeColors.Menu.Label",
    hint: "DHP.Settings.ThemeColors.Menu.Hint",
    icon: "fas fa-palette",
    type: ThemeColorsConfig,
    restricted: false,
  });

  game.settings.registerMenu(MODULE_ID, "uiElementsMenu", {
    name: "DHP.Settings.UIElements.Menu.Name",
    label: "DHP.Settings.UIElements.Menu.Label",
    hint: "DHP.Settings.UIElements.Menu.Hint",
    icon: "fas fa-window-maximize",
    type: UIElementsConfig,
    restricted: false,
  });

  game.settings.registerMenu(MODULE_ID, "tokenEffectsMenu", {
    name: "DHP.Settings.TokenEffects.Menu.Name",
    label: "DHP.Settings.TokenEffects.Menu.Label",
    hint: "DHP.Settings.TokenEffects.Menu.Hint",
    icon: "fas fa-sparkles",
    type: TokenEffectsConfig,
    restricted: true,
  });

  game.settings.registerMenu(MODULE_ID, "chatEffectsMenu", {
    name: "DHP.Settings.ChatEffects.Menu.Name",
    label: "DHP.Settings.ChatEffects.Menu.Label",
    hint: "DHP.Settings.ChatEffects.Menu.Hint",
    icon: "fas fa-comments",
    type: ChatEffectsConfig,
    restricted: false,
  });

  game.settings.registerMenu(MODULE_ID, "currencyMenu", {
    name: "DHP.Settings.Currency.Menu.Name",
    label: "DHP.Settings.Currency.Menu.Label",
    hint: "DHP.Settings.Currency.Menu.Hint",
    icon: "fas fa-coins",
    type: CurrencyConfig,
    restricted: true,
  });

  game.settings.registerMenu(MODULE_ID, "sheetDimensionsMenu", {
    name: "DHP.Settings.SheetDimensions.Menu.Name",
    label: "DHP.Settings.SheetDimensions.Menu.Label",
    hint: "DHP.Settings.SheetDimensions.Menu.Hint",
    icon: "fas fa-expand",
    type: SheetDimensionsConfig,
    restricted: true,
  });

  game.settings.registerMenu(MODULE_ID, "progressGradientsMenu", {
    name: "DHP.Settings.ProgressGradients.Menu.Name",
    label: "DHP.Settings.ProgressGradients.Menu.Label",
    hint: "DHP.Settings.ProgressGradients.Menu.Hint",
    icon: "fas fa-fill-drip",
    type: ProgressGradientsConfig,
    restricted: false,
  });

  game.settings.registerMenu(MODULE_ID, "customFontMenu", {
    name: "DHP.Settings.CustomFont.Menu.Name",
    label: "DHP.Settings.CustomFont.Menu.Label",
    hint: "DHP.Settings.CustomFont.Menu.Hint",
    icon: "fas fa-font",
    type: CustomFontConfig,
    restricted: false,
  });

  game.settings.registerMenu(MODULE_ID, "hoverDistanceMenu", {
    name: "DHP.Settings.HoverDistance.Menu.Name",
    label: "DHP.Settings.HoverDistance.Menu.Label",
    hint: "DHP.Settings.HoverDistance.Menu.Hint",
    icon: "fas fa-ruler",
    type: HoverDistanceConfig,
    restricted: false,
  });

  for (const c of COLOR_SETTINGS) {
    game.settings.register(MODULE_ID, c.key, {
      name: c.key,
      scope: "client",
      config: false,
      type: String,
      default: c.default,
      onChange: () => applyThemeColors(),
    });
  }

  game.settings.register(MODULE_ID, "enableFearTracker", {
    name: "Enable Fear Tracker",
    scope: "world",
    config: false,
    type: Boolean,
    default: false,
    onChange: (value) => {
      if (window.daggerheartPlus?.manageFearTracker) {
        window.daggerheartPlus.manageFearTracker();
      }
    },
  });

  game.settings.register(MODULE_ID, "enableEffectsHalo", {
    name: "Token Effects Halo",
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
    requiresReload: true,
    onChange: (value) => {
      try {
        applyEffectsHaloSetting(Boolean(value));
      } catch (e) {
        console.warn("Daggerheart Plus | Failed applying effects halo toggle", e);
      }
    },
  });

  game.settings.register(MODULE_ID, "effectsHaloIconSize", {
    name: "Halo Icon Size",
    scope: "world",
    config: false,
    type: Number,
    default: 18,
    requiresReload: true,
    onChange: (value) => {
      try {
        applyEffectsHaloIconSize(Number(value));
      } catch (e) {
        console.warn("Daggerheart Plus | Failed applying effects halo size", e);
      }
    },
  });

  game.settings.register(MODULE_ID, "effectsHaloSpacing", {
    name: "Halo Icon Spacing",
    scope: "world",
    config: false,
    type: Number,
    default: 0.85,
    onChange: (value) => {
      try {
        applyEffectsHaloSpacing(Number(value));
      } catch (e) {
        console.warn("Daggerheart Plus | Failed applying effects halo spacing", e);
      }
    },
  });

  game.settings.register(MODULE_ID, "enableCharacterSheetSidebars", {
    name: "Character Sheet Sidebars",
    scope: "client",
    config: false,
    type: Boolean,
    default: true,
    onChange: (value) => {
      try {
        for (const app of Object.values(ui.applications)) {
          if (app?.constructor?.name !== "DaggerheartPlusCharacterSheet") continue;
          if (value) app._mountInlineRails?.();
          else app._removeInlineRails?.();
        }
      } catch (e) {
        console.warn("Daggerheart Plus | Failed applying sidebar toggle", e);
      }
    },
  });

  game.settings.register(MODULE_ID, "tooltipCardMaxWidth", {
    name: "Tooltip Card Max Width",
    scope: "client",
    config: false,
    type: Number,
    default: 304,
    onChange: () => {
      try {
        applyTooltipCardMaxWidth();
      } catch (e) {
        console.warn("Daggerheart Plus | Failed applying tooltip card max width", e);
      }
    },
  });

  game.settings.register(MODULE_ID, "alwaysShowLoadoutResourceCounters", {
    name: "Always Show Loadout Resource Counters",
    scope: "client",
    config: false,
    type: Boolean,
    default: false,
    onChange: (value) => {
      try {
        for (const app of Object.values(ui.applications)) {
          if (app?.constructor?.name !== "DaggerheartPlusCharacterSheet") continue;
          app._updateAllLoadoutResourceBadges?.();
        }
      } catch (e) {
        console.warn("Daggerheart Plus | Failed applying loadout resource counter visibility", e);
      }
    },
  });

  game.settings.register(MODULE_ID, "enableResourcePips", {
    name: "Pip Display for Resources",
    scope: "client",
    config: false,
    type: Boolean,
    default: false,
    onChange: () => {
      try {
        for (const app of Object.values(ui.applications)) {
          if (app?.constructor?.name?.startsWith?.("DaggerheartPlus") && typeof app.render === "function") {
            app.render(false);
          }
        }
      } catch (e) {
        console.warn("Daggerheart Plus | Failed re-rendering sheets for pip display", e);
      }
    },
  });

  game.settings.register(MODULE_ID, "enableCurrency", {
    name: "Enable Currency",
    scope: "world",
    config: false,
    type: Boolean,
    default: true,
    onChange: (value) => {
      try {
        applyCurrencyVisibility(Boolean(value));
      } catch (e) {
        console.warn("Daggerheart Plus | Failed applying currency visibility", e);
      }
    },
  });

  game.settings.register(MODULE_ID, "currencyIconCoins", {
    name: "Currency Icon: Coins",
    scope: "world",
    config: false,
    type: String,
    default: "",
    onChange: () => applyCurrencyIcons(),
  });

  game.settings.register(MODULE_ID, "currencyIconHandfuls", {
    name: "Currency Icon: Handfuls",
    scope: "world",
    config: false,
    type: String,
    default: "",
    onChange: () => applyCurrencyIcons(),
  });

  game.settings.register(MODULE_ID, "currencyIconBags", {
    name: "Currency Icon: Bags",
    scope: "world",
    config: false,
    type: String,
    default: "",
    onChange: () => applyCurrencyIcons(),
  });

  game.settings.register(MODULE_ID, "currencyIconChests", {
    name: "Currency Icon: Chests",
    scope: "world",
    config: false,
    type: String,
    default: "",
    onChange: () => applyCurrencyIcons(),
  });

  game.settings.register(MODULE_ID, "enableTokenCounters", {
    name: "Enable Token Counters",
    scope: "client",
    config: false,
    type: Boolean,
    default: false,
    onChange: (value) => {
      try {
        applyTokenCountersVisibilityBySetting();
      } catch (e) {
        console.warn("Daggerheart Plus | Failed applying token counters toggle", e);
      }
    },
  });

  game.settings.register(MODULE_ID, "enableEnhancedChat", {
    name: "Enhanced Chat Styling",
    scope: "client",
    config: false,
    type: Boolean,
    default: true,
    onChange: (value) => {
      try {
        applyEnhancedChatStyles(Boolean(value));
      } catch (e) {
        console.warn("Daggerheart Plus | Failed applying enhanced chat toggle", e);
      }
      try {
        applyCriticalHitParticles();
      } catch (e) {
        console.warn("Daggerheart Plus | Failed applying critical hit particles", e);
      }
    },
  });

  game.settings.register(MODULE_ID, "alwaysOpenDomainCards", {
    name: "Always Open Moves",
    scope: "client",
    config: false,
    type: Boolean,
    default: false,
    onChange: (value) => {
      try {
        applyDomainCardOpenSetting(Boolean(value));
      } catch (e) {
        console.warn("Daggerheart Plus | Failed applying move open setting", e);
      }
    },
  });

  game.settings.register(MODULE_ID, "enableParticles", {
    name: "Use Particle Effects",
    scope: "client",
    config: false,
    type: Boolean,
    default: true,
    onChange: (value) => {
      try {
        applyParticleEffects(Boolean(value));
      } catch (e) {
        console.warn("Daggerheart Plus | Failed applying particle effects", e);
      }
      try {
        applyCriticalHitParticles(Boolean(value));
      } catch (e) {
        console.warn("Daggerheart Plus | Failed applying critical hit particles", e);
      }
    },
  });

  game.settings.register(MODULE_ID, "defaultSheetWidth", {
    name: "Default Sheet Width",
    scope: "world",
    config: false,
    type: Number,
    default: 900,
  });

  game.settings.register(MODULE_ID, "defaultSheetHeight", {
    name: "Default Sheet Height",
    scope: "world",
    config: false,
    type: Number,
    default: 800,
  });

  game.settings.register(MODULE_ID, "adversarySheetWidth", {
    name: "Adversary Sheet Width",
    scope: "world",
    config: false,
    type: Number,
    default: 750,
  });

  game.settings.register(MODULE_ID, "adversarySheetHeight", {
    name: "Adversary Sheet Height",
    scope: "world",
    config: false,
    type: Number,
    default: 820,
  });

  game.settings.register(MODULE_ID, "customFontFile", {
    name: "Custom Font File",
    scope: "client",
    config: false,
    type: String,
    default: "",
    onChange: () => applyCustomFont(),
  });

  try {
    applyTooltipCardMaxWidth();
  } catch (e) {
    console.warn("Daggerheart Plus | Failed applying tooltip card max width during init", e);
  }

  try {
    applyCustomFont();
  } catch (e) {
    console.warn("Daggerheart Plus | Failed applying custom font during init", e);
  }

  console.log("Daggerheart Plus | Module settings registered");
}

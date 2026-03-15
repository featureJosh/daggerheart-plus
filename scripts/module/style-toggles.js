import { MODULE_ID, COLOR_LIGHT_DARK_DEFAULTS, COLOR_CSS_MAP, colorSettingKey } from "./constants.js";

const DEFAULT_FONT_URL = "https://fonts.googleapis.com/css2?family=Texturina:ital,opsz,wght@0,12..72,100..900;1,12..72,100..900&display=swap";

function getColor(key, variant) {
  const defaults = COLOR_LIGHT_DARK_DEFAULTS[key];
  try {
    const raw = game.settings.get(MODULE_ID, colorSettingKey(key, variant));
    return (raw ? String(raw) : null) || defaults[variant];
  } catch {
    return defaults[variant];
  }
}

export function applyColorOverrides() {
  try {
    const merged = {};
    for (const key of Object.keys(COLOR_LIGHT_DARK_DEFAULTS)) {
      merged[key] = {
        light: getColor(key, "light"),
        dark: getColor(key, "dark"),
      };
    }

    let css = "body, .daggerheart-plus.sheet {\n";
    for (const [key, cssVar] of Object.entries(COLOR_CSS_MAP)) {
      const { light, dark } = merged[key];
      css += `  ${cssVar}: light-dark(${light}, ${dark});\n`;
    }

    const shadowLight = "rgba(0, 0, 0, 0.15)";
    const shadowDark = "rgba(0, 0, 0, 0.5)";
    css += `  --dhp-shadow: light-dark(${shadowLight}, ${shadowDark});\n`;

    const shadowHeavyLight = "rgba(0, 0, 0, 0.25)";
    const shadowHeavyDark = "rgba(0, 0, 0, 0.7)";
    css += `  --dhp-shadow-heavy: light-dark(${shadowHeavyLight}, ${shadowHeavyDark});\n`;

    css += "}\n";

    let styleEl = document.getElementById("dhp-color-overrides");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "dhp-color-overrides";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
  } catch (e) {
    console.warn("Daggerheart Plus | Failed to apply color overrides", e);
  }
}

export function applyEnhancedChatStyles(enabled) {
  try {
    const LINK_ID = "dhp-enhanced-chat-style";
    const TEMPLATES_LINK_ID = "dhp-enhanced-chat-templates-style";

    let link = document.getElementById(LINK_ID);
    let templatesLink = document.getElementById(TEMPLATES_LINK_ID);

    if (enabled) {
      if (!link) {
        link = document.createElement("link");
        link.id = LINK_ID;
        link.rel = "stylesheet";
        link.href = `modules/${MODULE_ID}/styles/enhanced-chat-message.css`;
        document.head.appendChild(link);
      }

      if (!templatesLink) {
        templatesLink = document.createElement("link");
        templatesLink.id = TEMPLATES_LINK_ID;
        templatesLink.rel = "stylesheet";
        templatesLink.href = `modules/${MODULE_ID}/styles/enhanced-chat-templates.css`;
        document.head.appendChild(templatesLink);
      }
    } else {
      if (link) link.remove();
      if (templatesLink) templatesLink.remove();
    }
  } catch (e) {
    console.warn(
      "Daggerheart Plus | Failed to toggle enhanced chat stylesheet link",
      e
    );
  }
}

export function applyParticleEffects(enabled) {
  try {
    const particlesEnabled = game.settings.get(MODULE_ID, "enableParticles");
    if (!particlesEnabled) {
      document.querySelectorAll(".dhp-spell-particles").forEach((canvas) => {
        const host = canvas.parentElement;
        if (host && host._dhpParticlesFX) {
          host._dhpParticlesFX.stop();
        }
      });
    }

    for (const [, app] of foundry.applications.instances) {
      if (app?.constructor?.name === "DaggerheartPlusCharacterSheet") {
        if (particlesEnabled) {
          app._mountSpellParticles?.();
        } else {
          app._unmountSpellParticles?.();
        }
      }
    }
  } catch (e) {
    console.warn(
      "Daggerheart Plus | Failed to apply particle effects toggle",
      e
    );
  }
}

export function applyCriticalHitParticles(enabled) {
  try {
    const critParticlesEnabled = Boolean(
      game.settings.get(MODULE_ID, "enableParticles")
    );
    const enhancedChatEnabled = Boolean(
      game.settings.get(MODULE_ID, "enableEnhancedChat")
    );
    const shouldEnable = critParticlesEnabled && enhancedChatEnabled;

    if (!shouldEnable) {
      document
        .querySelectorAll(".dhp-crit-particles")
        .forEach((canvas) => {
          const host = canvas.parentElement;
          if (host && host._dhpCritFX) {
            host._dhpCritFX.stop();
          } else {
            host?.classList?.remove?.("dhp-crit-fx");
            canvas.remove();
          }
        });
    }

    if (window.daggerheartPlus?.enhancedChatEffects) {
      if (shouldEnable) {
        window.daggerheartPlus.enhancedChatEffects.init();
      } else {
        window.daggerheartPlus.enhancedChatEffects.disable();
      }
    }
  } catch (e) {
    console.warn(
      "Daggerheart Plus | Failed to apply critical hit particles toggle",
      e
    );
  }
}

export function applyDomainCardOpenSetting(enabled) {
  try {
    const moveElements = document.querySelectorAll(
      ".domain-card-move, .action-move"
    );
    moveElements.forEach((element) => {
      if (enabled) {
        element.setAttribute("open", "");
        const chevron = element.querySelector(".fa-chevron-down");
        if (chevron) {
          chevron.style.display = "none";
        }
      } else {
        element.removeAttribute("open");
        const chevron = element.querySelector(".fa-chevron-down");
        if (chevron) {
          chevron.style.display = "";
        }
      }
    });
  } catch (e) {
    console.warn(
      "Daggerheart Plus | Failed to apply move open setting",
      e
    );
  }
}

export function applyTokenCountersVisibilityBySetting() {
  try {
    const enabled = Boolean(game.settings.get(MODULE_ID, "enableTokenCounters"));
    const left = document.querySelector("#token-counters-left");
    const right = document.querySelector("#token-counters-right");
    if (left) left.style.display = enabled ? "" : "none";
    if (right) right.style.display = enabled ? "" : "none";

    try {
      window.daggerheartPlus.updateCountersWrapperDisplay();
    } catch (_) { }
  } catch (_) { }
}

export function applyCurrencyVisibility(enabled) {
  try {
    document.querySelectorAll(".daggerheart-plus.sheet .currency-section").forEach((el) => {
      el.style.display = enabled ? "" : "none";
    });
  } catch (e) {
    console.warn("Daggerheart Plus | Failed to apply currency visibility", e);
  }
}

export function applySystemCurrencyVisibility() {
  try {
    let currencyEnabled = {
      coins: true,
      handfuls: true,
      bags: true,
      chests: true,
    };

    try {
      const homebrew = game.settings.get('daggerheart', 'Homebrew');
      if (homebrew?.currency) {
        currencyEnabled = {
          coins: homebrew.currency.coins?.enabled !== false,
          handfuls: homebrew.currency.handfuls?.enabled !== false,
          bags: homebrew.currency.bags?.enabled !== false,
          chests: homebrew.currency.chests?.enabled !== false,
        };
      }
    } catch (err) {
      console.warn("Daggerheart Plus | Could not access system currency settings, using defaults", err);
    }

    document.querySelectorAll(".daggerheart-plus.sheet .currency-input").forEach((el) => {
      const currencyType = el.dataset.currency;
      if (currencyType && currencyEnabled[currencyType] !== undefined) {
        el.style.display = currencyEnabled[currencyType] ? "" : "none";
      }
    });
  } catch (e) {
    console.warn("Daggerheart Plus | Failed to apply system currency visibility", e);
  }
}

export function applyCurrencyIcons() {
  try {
    const iconSettings = {
      coins: game.settings.get(MODULE_ID, "currencyIconCoins"),
      handfuls: game.settings.get(MODULE_ID, "currencyIconHandfuls"),
      bags: game.settings.get(MODULE_ID, "currencyIconBags"),
      chests: game.settings.get(MODULE_ID, "currencyIconChests"),
    };

    document.querySelectorAll(".daggerheart-plus.sheet .currency-input").forEach((input) => {
      const currencyType = input.dataset.currency;
      const customIcon = iconSettings[currencyType];
      const iconContainer = input.querySelector(".icon");
      if (!iconContainer) return;

      if (customIcon) {
        iconContainer.replaceChildren();
        const img = document.createElement("img");
        img.src = customIcon;
        img.alt = currencyType;
        img.style.cssText = "width: 18px; height: 18px; object-fit: contain;";
        iconContainer.appendChild(img);
      } else {
        const defaultIcons = {
          coins: '<i class="fa-solid fa-coin-front"></i>',
          handfuls: '<i class="fa-solid fa-coins"></i>',
          bags: '<i class="fa-solid fa-sack"></i>',
          chests: '<i class="fa-solid fa-treasure-chest"></i>',
        };
        iconContainer.innerHTML = defaultIcons[currencyType] || "";
      }
    });
  } catch (e) {
    console.warn("Daggerheart Plus | Failed to apply currency icons", e);
  }
}

export function applyCurrencyLabels() {
  try {
    const defaultLabels = {
      coins: "Coins",
      handfuls: "Handfuls",
      bags: "Bags",
      chests: "Chests",
    };

    let systemLabels = { ...defaultLabels };
    
    try {
      const homebrew = game.settings.get('daggerheart', 'Homebrew');
      if (homebrew?.currency) {
        systemLabels = {
          coins: homebrew.currency.coins?.label || defaultLabels.coins,
          handfuls: homebrew.currency.handfuls?.label || defaultLabels.handfuls,
          bags: homebrew.currency.bags?.label || defaultLabels.bags,
          chests: homebrew.currency.chests?.label || defaultLabels.chests,
        };
      }
    } catch (err) {
      console.warn("Daggerheart Plus | Could not access system currency settings, using defaults", err);
    }

    document.querySelectorAll(".daggerheart-plus.sheet .currency-input").forEach((input) => {
      const currencyType = input.dataset.currency;
      const label = systemLabels[currencyType];
      if (label) {
        input.dataset.tooltip = label;
      }
    });
  } catch (e) {
    console.warn("Daggerheart Plus | Failed to apply currency labels", e);
  }
}

export function applyCustomFont() {
  try {
    const STYLE_ID = "dhp-custom-font-style";
    const FONT_LINK_ID = "dhp-custom-font-link";

    let fontLink = document.getElementById(FONT_LINK_ID);
    if (!fontLink) {
      fontLink = document.createElement("link");
      fontLink.id = FONT_LINK_ID;
      fontLink.rel = "stylesheet";
      fontLink.href = DEFAULT_FONT_URL;
      document.head.appendChild(fontLink);
    }

    let styleEl = document.getElementById(STYLE_ID);
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = STYLE_ID;
      document.head.appendChild(styleEl);
    }

    const customFontFile = game.settings.get(MODULE_ID, "customFontFile");

    if (customFontFile) {
      styleEl.textContent = `
        @font-face {
          font-family: "DHP-CustomFont";
          src: url("${customFontFile}");
          font-display: swap;
        }
        :root {
          --dhp-title-font: "DHP-CustomFont";
        }
      `;
    } else {
      styleEl.textContent = `
        :root {
          --dhp-title-font: "Texturina";
        }
      `;
    }
  } catch (e) {
    console.warn("Daggerheart Plus | Failed to apply custom font", e);
  }
}

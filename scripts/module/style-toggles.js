import { MODULE_ID, COLOR_SETTINGS } from "./constants.js";

export function applyThemeColors() {
  try {
    const sheets = document.querySelectorAll(".daggerheart-plus.sheet");
    for (const c of COLOR_SETTINGS) {
      const val = game.settings.get(MODULE_ID, c.key);
      if (val && val !== c.default) {
        sheets.forEach((sheet) => sheet.style.setProperty(c.cssVar, val));
      }
    }
  } catch (e) {
    console.warn("Daggerheart Plus | Failed to apply theme colors", e);
  }
}

export function applyThemeColorsToSheet(sheet) {
  try {
    for (const c of COLOR_SETTINGS) {
      const val = game.settings.get(MODULE_ID, c.key);
      if (val && val !== c.default) {
        sheet.style.setProperty(c.cssVar, val);
      }
    }
  } catch (e) {
    console.warn("Daggerheart Plus | Failed to apply theme colors to sheet", e);
  }
}

export function applyEnhancedChatStyles(enabled) {
  try {
    const LINK_ID = "dhp-enhanced-chat-style";
    const TEMPLATES_LINK_ID = "dhp-enhanced-chat-templates-style";

    let link = document.getElementById(LINK_ID);
    let templatesLink = document.getElementById(TEMPLATES_LINK_ID);

    if (enabled) {
      // Load main chat message CSS
      if (!link) {
        link = document.createElement("link");
        link.id = LINK_ID;
        link.rel = "stylesheet";
        link.href = `modules/${MODULE_ID}/styles/enhanced-chat-message.css`;
        document.head.appendChild(link);
      }

      // Load chat templates CSS
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

    for (const app of Object.values(ui.applications)) {
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
        iconContainer.innerHTML = `<img src="${customIcon}" alt="${currencyType}" style="width: 18px; height: 18px; object-fit: contain;">`;
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

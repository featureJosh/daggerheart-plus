import { MODULE_ID } from "./constants.js";

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

import { MODULE_ID, SYSTEM_ID } from "./module/constants.js";
import { registerModuleSettings } from "./module/settings.js";
import {
  applyEnhancedChatStyles,
  applyParticleEffects,
  applyCriticalHitParticles,
} from "./module/style-toggles.js";
import { registerDomainCardHooks } from "./module/domain-cards.js";
import { enhanceTooltipManager, applyTooltipCardMaxWidth } from "./module/tooltip-manager.js";
import {
  registerDaggerheartPlusSheets,
  getDefaultSheetSize,
  getDefaultAdversarySheetSize,
  applyDefaultSizeToApp,
} from "./module/sheets/register.js";
import {
  registerHoverDistanceSettings,
  initializeHoverDistance,
} from "./module/hover-distance.js";
import { preloadModuleTemplates } from "./module/template-preload.js";
import { registerGradientSettings } from "./module/progress-gradients.js";
import {
  bootstrapGlobalUi,
  manageFearTracker,
  manageTokenCounters,
  EnhancedChatEffects,
} from "./module/global-api.js";
import { registerUiHooks } from "./module/ui-hooks.js";
import { initializeEffectsHalo, applyEffectsHaloSetting } from "./module/effects-halo.js";

registerGradientSettings();
registerUiHooks();
initializeEffectsHalo();

Hooks.once("init", () => {
  console.log("Daggerheart Plus | Initializing module");

  if (game.system.id !== SYSTEM_ID) {
    console.error(
      "Daggerheart Plus | This module requires the Daggerheart system"
    );
    return;
  }

  registerModuleSettings();
  registerDomainCardHooks();
  registerHoverDistanceSettings();
  preloadModuleTemplates();
  enhanceTooltipManager();
});

Hooks.once("ready", () => {
  initializeHoverDistance();
});

Hooks.once("ready", async () => {
  try {
    const effectsHaloEnabled = game.settings.get(
      MODULE_ID,
      "enableEffectsHalo"
    );
    applyEffectsHaloSetting(Boolean(effectsHaloEnabled));

    const enhancedEnabled = game.settings.get(
      MODULE_ID,
      "enableEnhancedChat"
    );
    applyEnhancedChatStyles(Boolean(enhancedEnabled));

    try {
      EnhancedChatEffects.init();
    } catch (_) {}

    try {
      applyParticleEffects(true);
    } catch (_) {}

    try {
      applyCriticalHitParticles(true);
    } catch (_) {}
  } catch (e) {
    console.warn(
      "Daggerheart Plus | Failed to apply initial enhanced chat state",
      e
    );
  }

  console.log("Daggerheart Plus | Module ready - creating enhanced sheets");

  registerDaggerheartPlusSheets();
  await bootstrapGlobalUi();

  Hooks.on("updateSetting", async (setting) => {
    if (setting.namespace !== MODULE_ID) return;

    if (setting.key === "enableFearTracker") {
      await manageFearTracker();
      return;
    }

    if (setting.key === "enableTokenCounters") {
      await manageTokenCounters();
      return;
    }

    if (setting.key === "enableEffectsHalo") {
      applyEffectsHaloSetting(Boolean(setting.value));
      return;
    }

    if (setting.key === "enableEnhancedChat") {
      try {
        applyEnhancedChatStyles(Boolean(setting.value));
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed applying enhanced chat toggle (updateSetting)",
          e
        );
      }

      try {
        applyCriticalHitParticles();
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed applying critical hit particles toggle (updateSetting)",
          e
        );
      }
      return;
    }

    if (setting.key === "enableParticles") {
      try {
        applyParticleEffects(Boolean(setting.value));
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed applying particle effects toggle (updateSetting)",
          e
        );
      }
      return;
    }

    if (setting.key === "enableCriticalHitParticles") {
      try {
        applyCriticalHitParticles(Boolean(setting.value));
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed applying critical hit particles toggle (updateSetting)",
          e
        );
      }
      return;
    }

    if (
      setting.key === "defaultSheetWidth" ||
      setting.key === "defaultSheetHeight"
    ) {
      const size = getDefaultSheetSize();
      for (const app of Object.values(ui.windows)) {
        const name = app?.constructor?.name;
        if (!name?.startsWith?.("DaggerheartPlus")) continue;
        if (name?.includes?.("Adversary")) continue;

        if (name === "DaggerheartPlusCompanionSheet") {
          applyDefaultSizeToApp(app, { width: 340, height: size.height });
        } else {
          applyDefaultSizeToApp(app, size);
        }
      }
      if (game.user.isGM)
        ui.notifications.info(
          `DH+ sheet size set to ${size.width}x${size.height}.`
        );
      return;
    }

    if (
      setting.key === "adversarySheetWidth" ||
      setting.key === "adversarySheetHeight"
    ) {
      const size = getDefaultAdversarySheetSize();
      for (const app of Object.values(ui.windows)) {
        if (app?.constructor?.name === "DaggerheartPlusAdversarySheet") {
          applyDefaultSizeToApp(app, size);
        }
      }
      if (game.user.isGM)
        ui.notifications.info(
          `DH+ adversary sheet size set to ${size.width}x${size.height}.`
        );
      return;
    }

    if (setting.key === "tooltipCardMaxWidth") {
      try {
        applyTooltipCardMaxWidth(setting.value);
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed applying tooltip card max width (updateSetting)",
          e
        );
      }
      return;
    }
    if (setting.key === "enableCharacterSheetSidebars") {
      const useRails = game.settings.get(
        MODULE_ID,
        "enableCharacterSheetSidebars"
      );
      for (const app of Object.values(ui.windows)) {
        if (app?.constructor?.name !== "DaggerheartPlusCharacterSheet")
          continue;
        if (useRails) app._mountInlineRails?.();
        else app._removeInlineRails?.();
      }
      return;
    }
  });

  if (game.user.isGM) {
    ui.notifications.info("Daggerheart Plus module loaded successfully!");
  }
});

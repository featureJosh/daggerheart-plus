import { MODULE_ID } from "./constants.js";
import { applyEffectsHaloSetting, applyEffectsHaloIconSize, applyEffectsHaloSpacing } from "./effects-halo.js";
import { applyTooltipCardMaxWidth } from "./tooltip-manager.js";
import { applyEnhancedChatStyles, applyParticleEffects, applyCriticalHitParticles, applyTokenCountersVisibilityBySetting, applyDomainCardOpenSetting } from "./style-toggles.js";

export function registerModuleSettings() {
  game.settings.register(MODULE_ID, "enableFearTracker", {
    name: "Enable Fear Tracker",
    hint: "Enables a fear tracker UI that displays above the hotbar. The tracker integrates with the Daggerheart system to show and modify the current fear level.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      console.log("Daggerheart Plus | Fear tracker setting changed:", value);
      if (window.daggerheartPlus?.manageFearTracker) {
        window.daggerheartPlus.manageFearTracker();
      }
    },
  });
  game.settings.register(MODULE_ID, "enableEffectsHalo", {
    name: game.i18n?.localize?.("DHP.Settings.TokenEffects.Halo.Name") || "Token Effects Halo",
    hint: game.i18n?.localize?.("DHP.Settings.TokenEffects.Halo.Hint") || "Arrange token effect icons in a circular halo around tokens instead of stacked columns.",
    scope: "world",
    config: true,
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
    name: game.i18n?.localize?.("DHP.Settings.TokenEffects.Halo.Size.Name") || "Halo Icon Size",
    hint: game.i18n?.localize?.("DHP.Settings.TokenEffects.Halo.Size.Hint") || "Set the base pixel size for halo-arranged token effect icons.",
    scope: "world",
    config: true,
    type: Number,
    default: 18,
    range: { min: 12, max: 32, step: 1 },
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
    name: game.i18n?.localize?.("DHP.Settings.TokenEffects.Halo.Spacing.Name") || "Halo Icon Spacing",
    hint: game.i18n?.localize?.("DHP.Settings.TokenEffects.Halo.Spacing.Hint") || "Multiplier to expand or tighten spacing between halo effect icons.",
    scope: "world",
    config: true,
    type: Number,
    default: 0.85,
    range: { min: 0.5, max: 1.5, step: 0.05 },
    onChange: (value) => {
      try {
        applyEffectsHaloSpacing(Number(value));
      } catch (e) {
        console.warn("Daggerheart Plus | Failed applying effects halo spacing", e);
      }
    },
  });



  game.settings.register(MODULE_ID, "enableTokenCounters", {
    name: "Enable Token Counters",
    hint: "Show the token counters UI (HP, Hope, Stress, Armor) near the hotbar for the currently selected token. Per-user preference.",
    scope: "client",
    config: true,
    type: Boolean,

    default: false,
    onChange: (value) => {
      try {
        applyTokenCountersVisibilityBySetting();
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed applying token counters toggle",
          e
        );
      }
    },
  });

  game.settings.register(MODULE_ID, "enableCharacterSheetSidebars", {
    name: "Character Sheet Sidebars (Rails)",
    hint: "Show left/right inline rails on DH+ Character sheets. Per-user preference only.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      try {
        for (const app of Object.values(ui.windows)) {
          if (app?.constructor?.name !== "DaggerheartPlusCharacterSheet")
            continue;
          if (value) app._mountInlineRails?.();
          else app._removeInlineRails?.();
        }
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed applying sidebar toggle to open sheets",
          e
        );
      }
    },
  });

  game.settings.register(MODULE_ID, "tooltipCardMaxWidth", {
    name: "Tooltip Card Max Width (px)",
    hint: "Set the maximum width applied to DH+ tooltip cards. Honors viewport constraints and keeps the hero image aspect ratio intact.",
    scope: "client",
    config: true,
    type: Number,
    default: 304,
    range: { min: 220, max: 640, step: 10 },
    onChange: () => {
      try {
        applyTooltipCardMaxWidth();
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed applying tooltip card max width",
          e
        );
      }
    },
  });

  game.settings.register(MODULE_ID, "alwaysShowLoadoutResourceCounters", {
    name: "Always Show Loadout Resource Counters",
    hint: "Show loadout card resource counters even when the card is not hovered. Per-user preference.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      try {
        for (const app of Object.values(ui.windows)) {
          if (app?.constructor?.name !== "DaggerheartPlusCharacterSheet") continue;
          app._updateAllLoadoutResourceBadges?.();
        }
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed applying loadout resource counter visibility toggle",
          e
        );
      }
    },
  });

  game.settings.register(MODULE_ID, "defaultSheetWidth", {
    name: "Default DH+ Sheet Width (px)",
    hint: "Default width applied to DH+ actor sheets (Character, Adversary, Companion, Environment). Reopen sheets to apply if not updated automatically.",
    scope: "world",

    config: false,
    type: Number,
    default: 900,
    range: { min: 400, max: 2000, step: 10 },
  });

  game.settings.register(MODULE_ID, "defaultSheetHeight", {
    name: "Default DH+ Sheet Height (px)",
    hint: "Default height applied to DH+ actor sheets (Character, Adversary, Companion, Environment). Reopen sheets to apply if not updated automatically.",
    scope: "world",

    config: false,
    type: Number,
    default: 800,
    range: { min: 300, max: 1600, step: 10 },
  });

  game.settings.register(MODULE_ID, "adversarySheetWidth", {
    name: "Default DH+ Adversary Width (px)",
    hint: "Default width applied to DH+ Adversary sheets.",
    scope: "world",

    config: false,
    type: Number,
    default: 630,
    range: { min: 400, max: 2000, step: 10 },
  });

  game.settings.register(MODULE_ID, "adversarySheetHeight", {
    name: "Default DH+ Adversary Height (px)",
    hint: "Default height applied to DH+ Adversary sheets.",
    scope: "world",

    config: false,
    type: Number,
    default: 820,
    range: { min: 300, max: 1600, step: 10 },
  });

  try {
    applyTooltipCardMaxWidth();
  } catch (e) {
    console.warn(
      "Daggerheart Plus | Failed applying tooltip card max width during init",
      e
    );
  }

  console.log("Daggerheart Plus | Module settings registered");

  function applyTokenCountersVisibilityBySetting() {
    try {
      const enabled = Boolean(
        game.settings.get(MODULE_ID, "enableTokenCounters")
      );
      const left = document.querySelector("#token-counters-left");
      const right = document.querySelector("#token-counters-right");
      if (left) left.style.display = enabled ? "" : "none";
      if (right) right.style.display = enabled ? "" : "none";

      try {
        window.daggerheartPlus.updateCountersWrapperDisplay();
      } catch (_) {}
    } catch (_) {}
  }

  game.settings.register(MODULE_ID, "enableEnhancedChat", {
    name:
      game.i18n?.localize?.("DHP.Settings.EnhancedChat.Enable.Name") ||
      "Enhanced Chat Styling",
    hint:
      game.i18n?.localize?.("DHP.Settings.EnhancedChat.Enable.Hint") ||
      "Enable redesigned DH+ styles for chat messages.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      try {
        applyEnhancedChatStyles(Boolean(value));
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed applying enhanced chat toggle",
          e
        );
      }

      try {
        applyCriticalHitParticles();
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed applying critical hit particles toggle (enhanced chat)",
          e
        );
      }
    },
  });

  game.settings.register(MODULE_ID, "enableParticles", {
    name: game.i18n?.localize?.("DHP.Settings.Particles.Enable.Name") || "Use Particles",
    hint: game.i18n?.localize?.("DHP.Settings.Particles.Enable.Hint") || "Enable particle effects for spellcasting traits and other UI elements.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      try {
        applyParticleEffects(Boolean(value));
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed applying particle effects toggle",
          e
        );
      }
    },
  });

  game.settings.register(MODULE_ID, "enableCriticalHitParticles", {
    name: game.i18n?.localize?.("DHP.Settings.Particles.CriticalHit.Name") || "Use Critical Hit Particles",
    hint: game.i18n?.localize?.("DHP.Settings.Particles.CriticalHit.Hint") || "Enable particle effects for critical success rolls in chat messages.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      try {
        applyCriticalHitParticles(Boolean(value));
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed applying critical hit particles toggle",
          e
        );
      }
    },
  });

  game.settings.register(MODULE_ID, "alwaysOpenDomainCards", {
    name:
      game.i18n?.localize?.("DHP.Settings.Moves.AlwaysOpen.Name") ||
      "Always Open Moves",
    hint:
      game.i18n?.localize?.("DHP.Settings.Moves.AlwaysOpen.Hint") ||
      "Always show domain card and action move descriptions expanded in chat messages. Hides the chevron icon when enabled.",
    scope: "client",
    config: true,
    type: Boolean,
    default: false,
    onChange: (value) => {
      try {
        applyDomainCardOpenSetting(Boolean(value));
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed applying move open setting",
          e
        );
      }
    },
  });


}

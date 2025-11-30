import { MODULE_ID } from "./constants.js";

export function registerUiHooks() {
  Hooks.on("renderSettingsConfig", (app, html) => {
    try {
      const $root = html && html.find ? html : $(html);
      if (!$root || !$root.length) return;

      const insertHeader = (beforeKey, title) => {
        const selector = `input[name='${MODULE_ID}.${beforeKey}']`;
        const $input = $root.find(selector).first();
        const $group = $input.closest(".form-group");
        if (!$group.length) return;
        if ($group.prev().hasClass("dhp-settings-header")) return;
        const block = `<div class="dhp-settings-header"><h4 style="margin-top: 0; border-bottom: 1px solid #888; padding-bottom: 4px; margin-bottom: 6px;">${title}</h4></div>`;
        $group.before(block);
      };

      insertHeader("enableFearTracker", "UI Enhancements");
      insertHeader("enableEffectsHalo", "UI Enhancements");
      insertHeader("enableParticles", "Particle Effects");
      insertHeader("alwaysOpenDomainCards", "Domain Cards");
      insertHeader("enableHoverDistance", "Hover Distance");
      insertHeader("hpGradient", "Styling: Progress Bar Gradients");
    } catch (e) {
      console.warn("Daggerheart Plus | Failed injecting settings headers", e);
    }
  });

  Hooks.on("renderApplicationV2", (app, element, data) => {
    if (!app.constructor.name.startsWith("DaggerheartPlus")) return;
    
    console.log(`Daggerheart Plus | Rendering ${app.constructor.name}`);

    try {
      const actor = app.document;
      if (actor && app.element) {
        window.daggerheartPlus?.bindProgressBarClicks?.(app.element, actor);
      }
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

import { MODULE_ID } from "./constants.js";
import { applyDomainCardOpenSetting } from "./style-toggles.js";

export function registerDomainCardHooks() {
  Hooks.on("renderChatMessageHTML", (message, html, context) => {
    try {
      const enabled = Boolean(game.settings.get(MODULE_ID, "alwaysOpenDomainCards"));
      if (enabled) {
        const moveElements = html.querySelectorAll('.domain-card-move, .action-move');
        moveElements.forEach((element) => {
          element.setAttribute('open', '');
          const chevron = element.querySelector('.fa-chevron-down');
          if (chevron) {
            chevron.style.display = 'none';
          }
        });
      }
    } catch (e) {
      console.warn(
        "Daggerheart Plus | Failed to apply move open setting to new message",
        e
      );
    }
  });

  Hooks.once("ready", () => {
    try {
      const enabled = Boolean(game.settings.get(MODULE_ID, "alwaysOpenDomainCards"));
      applyDomainCardOpenSetting(enabled);
    } catch (e) {
      console.warn(
        "Daggerheart Plus | Failed to apply domain card open setting on ready",
        e
      );
    }
  });
}

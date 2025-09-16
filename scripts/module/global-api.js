import { CounterUI } from "../applications/counter-ui.js";
import { TokenCounterUI } from "../applications/token-counter-ui.js";
import { EnhancedDiceStyling } from "../applications/enhanced-dice-styling.js";
import { EnhancedChatEffects } from "../applications/enhanced-chat-effects.js";
import { MODULE_ID } from "./constants.js";
import { applyTokenCountersVisibilityBySetting } from "./style-toggles.js";

export function initializeEnhancedDiceStyling() {
  EnhancedDiceStyling.initialize();
}

export async function modifyHP(actor, operation, amount) {
  try {
    if (!actor) return;
    const current = Number(actor.system?.resources?.hitPoints?.value ?? 0) || 0;
    const max = Number(actor.system?.resources?.hitPoints?.max ?? 0) || 0;
    const amt = Number(amount) || 0;
    if (!amt) return;
    const sign =
      operation === "subtract" || operation === "minus" || operation === "-"
        ? -1
        : 1;
    const next = Math.max(0, Math.min(current + sign * amt, max));
    if (next === current) return;
    await actor.update({ "system.resources.hitPoints.value": next });
  } catch (e) {
    console.error("Daggerheart Plus | modifyHP failed", e);
    ui.notifications?.error?.("Failed to modify HP.");
  }
}

export function bindThresholdClicks(root, actor) {
  try {
    if (!root || !actor) return;
    if (root._dhpThresholdDelegationBound) return;

    const clickHandler = (ev) => {
      const el = ev.target?.closest?.(
        '.threshold-text.threshold-clickable[data-action="mark-hp"]'
      );
      if (!el || !root.contains(el)) return;
      const amt = Number(el.dataset.hpAmount) || 0;
      if (!amt) return;
      ev.preventDefault();
      ev.stopPropagation();
      modifyHP(actor, "add", amt);
    };

    const contextHandler = (ev) => {
      const el = ev.target?.closest?.(
        '.threshold-text.threshold-clickable[data-action="mark-hp"]'
      );
      if (!el || !root.contains(el)) return;
      const amt = Number(el.dataset.hpAmount) || 0;
      if (!amt) return;
      ev.preventDefault();
      ev.stopPropagation();
      modifyHP(actor, "subtract", amt);
    };

    root.addEventListener("click", clickHandler, true);
    root.addEventListener("contextmenu", contextHandler, true);
    root._dhpThresholdDelegationBound = true;
  } catch (e) {
    console.warn("Daggerheart Plus | bindThresholdClicks failed", e);
  }
}

export async function sendDifficultyRollRequest(actor, options = {}) {
  try {
    if (!actor) return;
    const diff = Number(actor.system?.difficulty ?? 0) || 0;
    if (!diff) {
      ui.notifications?.warn?.("No difficulty set for this adversary.");
      return;
    }
    const title = options.title || `${actor.name}` + " | Difficulty " + diff;
    const content = `
      <div class="dhp-roll-request">
        <strong>Roll Request:</strong> [[/dr difficulty=${diff}]]{${title}}
      </div>
    `;
    await ChatMessage.create({
      content,
      speaker: ChatMessage.getSpeaker({ actor }),
    });
  } catch (e) {
    console.error("Daggerheart Plus | sendDifficultyRollRequest failed", e);
    ui.notifications?.error?.("Failed to send roll request.");
  }
}

export function bindAdversaryDifficultyClick(root, actor) {
  try {
    if (!root || !actor) return;
    if (root._dhpDifficultyDelegationBound) return;
    const handler = (ev) => {
      const el = ev.target?.closest?.('[data-action="requestDifficultyRoll"]');
      if (!el || !root.contains(el)) return;
      ev.preventDefault();
      ev.stopPropagation();
      sendDifficultyRollRequest(actor);
    };
    root.addEventListener("click", handler, true);
    root._dhpDifficultyDelegationBound = true;
  } catch (e) {
    console.warn("Daggerheart Plus | bindAdversaryDifficultyClick failed", e);
  }
}

export function bindProgressBarClicks(root, actor) {
  try {
    if (!root || !actor) return;
    if (root._dhpProgressDelegationBound) return;

    const adjustActorPath = async (path, delta, min = 0, max = undefined) => {
      const current = foundry.utils.getProperty(actor.system, path);
      const newVal = Math.max(
        min,
        Math.min(max ?? Number.MAX_SAFE_INTEGER, Number(current || 0) + delta)
      );
      const updatePath = `system.${path}`;
      await actor.update({ [updatePath]: newVal });
    };

    const adjustArmorMarks = async (delta) => {
      try {
        const armorItem = actor.items?.find?.(
          (i) => i.type === "armor" && i.system?.equipped
        );
        if (!armorItem) return false;
        const current = Number(armorItem.system?.marks?.value ?? 0) || 0;
        const max =
          Number(
            actor.system?.armorScore ?? armorItem.system?.baseScore ?? 0
          ) || 0;
        const next = Math.max(0, Math.min(max, current + delta));
        if (next === current) return true;
        await armorItem.update({ "system.marks.value": next });

        try {
          if (foundry.utils.hasProperty(actor.system, "resources.armor.value")) {
            await actor.update({ "system.resources.armor.value": next });
          }
        } catch (_) {}
        return true;
      } catch (e) {
        console.warn("Daggerheart Plus | adjustArmorMarks failed", e);
        return false;
      }
    };

    function resolveFieldAndBounds(container) {
      if (!container) return {};
      const bar = container.querySelector(
        "progress.progress-bar, .progress-bar"
      );
      let field = bar?.getAttribute?.("name") || bar?.dataset?.field;
      if (!field) {
        const input = container.querySelector(
          'input.bar-input, input.armor-marks-input, input[name^="system."]'
        );
        if (input?.name?.startsWith("system."))
          field = input.name.replace(/^system\./, "");
        else if (input?.name) field = input.name;
      }
      if (!field) {
        const labelText = (
          container.querySelector(".status-label h4")?.textContent || ""
        ).toLowerCase();
        if (labelText) {
          if (labelText.includes("hit point") || labelText.includes("hp"))
            field = "resources.hitPoints.value";
          else if (labelText.includes("stress"))
            field = "resources.stress.value";
          else if (labelText.includes("armor"))
            field = "resources.armor.value";
        }
      }

      let min = 0;
      let max;
      if (bar) {
        min = Number(bar.getAttribute("min") || 0) || 0;
        const maxAttr = bar.getAttribute("max");
        if (maxAttr != null) max = Number(maxAttr);
      }
      if (!max) {
        try {
          const styles = getComputedStyle(container);
          const cssMax = Number(
            (styles.getPropertyValue("--max") || "").trim()
          );
          if (!Number.isNaN(cssMax) && cssMax > 0) max = cssMax;
        } catch {}
      }
      return { field, min, max };
    }

    const clickHandler = async (ev) => {
      const container = ev.target?.closest?.(".status-bar");
      if (!container || !root.contains(container)) return;
      ev.preventDefault();
      ev.stopPropagation();
      const { field, min, max } = resolveFieldAndBounds(container);
      if (!field) return;
      if (actor.type === "character" && field === "resources.armor.value") {
        const ok = await adjustArmorMarks(+1);
        if (ok) return;
      }
      await adjustActorPath(field, +1, min, max);
    };

    const contextHandler = async (ev) => {
      const container = ev.target?.closest?.(".status-bar");
      if (!container || !root.contains(container)) return;
      ev.preventDefault();
      ev.stopPropagation();
      const { field, min, max } = resolveFieldAndBounds(container);
      if (!field) return;
      if (actor.type === "character" && field === "resources.armor.value") {
        const ok = await adjustArmorMarks(-1);
        if (ok) return;
      }
      await adjustActorPath(field, -1, min, max);
    };

    root.addEventListener("click", clickHandler, true);
    root.addEventListener("contextmenu", contextHandler, true);
    root._dhpProgressDelegationBound = true;
  } catch (e) {
    console.warn("Daggerheart Plus | bindProgressBarClicks failed", e);
  }
}

export function updateCountersWrapperDisplay() {
  try {
    const wrapper = document.getElementById("counters-wrapper");
    if (!wrapper) return;

    const fearActive = Boolean(window.daggerheartPlus?.fearTracker?.element);
    const tokenCountersEnabled = Boolean(
      game.settings.get(MODULE_ID, "enableTokenCounters")
    );
    const hasSelectedToken = Boolean(canvas?.tokens?.controlled?.length);
    const tokenCountersActive = Boolean(
      tokenCountersEnabled &&
        (window.daggerheartPlus?.tokenCounter?.element || hasSelectedToken)
    );

    const shouldShow = fearActive || tokenCountersActive;
    wrapper.style.display = shouldShow ? "" : "none";
  } catch (e) {}
}

export async function manageFearTracker() {
  try {
    const useFearTracker = game.settings.get(MODULE_ID, "enableFearTracker");

    if (useFearTracker) {
      if (!window.daggerheartPlus.fearTracker) {
        window.daggerheartPlus.fearTracker = new CounterUI();
        await window.daggerheartPlus.fearTracker.initialize();
      }
      window.daggerheartPlus.fearTracker.render();
    } else if (window.daggerheartPlus.fearTracker) {
      window.daggerheartPlus.fearTracker.dispose();
      window.daggerheartPlus.updateCountersWrapperDisplay();
    }
  } catch (error) {
    console.error("Daggerheart Plus | Error managing fear tracker:", error);
  }
}

export async function manageTokenCounters() {
  try {
    const enabled = game.settings.get(MODULE_ID, "enableTokenCounters");
    if (enabled) {
      if (!window.daggerheartPlus.tokenCounter) {
        const tc = new TokenCounterUI();
        await tc.initialize();
        window.daggerheartPlus.tokenCounter = tc;
      }

      try {
        window.daggerheartPlus.updateCountersWrapperDisplay();
      } catch (_) {}
    } else {
      try {
        window.daggerheartPlus.tokenCounter?.hide?.();
      } catch (_) {}
      try {
        window.daggerheartPlus.tokenCounter?.dispose?.();
      } catch (_) {}

      window.daggerheartPlus.updateCountersWrapperDisplay();
    }
  } catch (e) {
    console.error("Daggerheart Plus | Error managing token counters:", e);
  }
}

export function setupWindowApi() {
  window.daggerheartPlus = {
    fearTracker: null,
    tokenCounter: null,
    manageFearTracker: null,
    manageTokenCounters: null,
    updateCountersWrapperDisplay,
    enhancedDiceStyling: EnhancedDiceStyling,
    enhancedChatEffects: EnhancedChatEffects,
    modifyHP,
    bindThresholdClicks,
    sendDifficultyRollRequest,
    bindAdversaryDifficultyClick,
    bindProgressBarClicks,
  };

  window.daggerheartPlus.manageFearTracker = manageFearTracker;
  window.daggerheartPlus.manageTokenCounters = manageTokenCounters;

  console.log(
    "Daggerheart Plus | Token counter and enhanced dice styling initialized"
  );
}

export async function bootstrapGlobalUi() {
  setupWindowApi();
  initializeEnhancedDiceStyling();
  await manageFearTracker();
  await manageTokenCounters();
  try {
    applyTokenCountersVisibilityBySetting();
  } catch (_) {}
}
export { EnhancedChatEffects };

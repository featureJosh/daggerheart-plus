import { CounterUI } from "./applications/counter-ui.js";
import { TokenCounterUI } from "./applications/token-counter-ui.js";
import { EnhancedDiceStyling } from "./applications/enhanced-dice-styling.js";
import { HoverDistance } from "./applications/hover-distance.js";
import { EnhancedChatEffects } from "./applications/enhanced-chat-effects.js";

const MODULE_ID = "daggerheart-plus";
const SYSTEM_ID = "daggerheart";

function applyEnhancedChatStyles(enabled) {
  try {
    const LINK_ID = "dhp-enhanced-chat-style";
    let link = document.getElementById(LINK_ID);
    if (enabled) {
      if (!link) {
        link = document.createElement("link");
        link.id = LINK_ID;
        link.rel = "stylesheet";
        link.href = `modules/${MODULE_ID}/styles/enhanced-chat-message.css`;
        document.head.appendChild(link);
      }
    } else if (link) {
      link.remove();
    }
  } catch (e) {
    console.warn(
      "Daggerheart Plus | Failed to toggle enhanced chat stylesheet link",
      e
    );
  }
}

Hooks.once("init", () => {
  console.log("Daggerheart Plus | Initializing module");

  if (game.system.id !== SYSTEM_ID) {
    console.error(
      "Daggerheart Plus | This module requires the Daggerheart system"
    );
    return;
  }

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
        updateCountersWrapperDisplay();
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
    },
  });

  try {
    HoverDistance.registerSettings();
  } catch (e) {
    console.warn(
      "Daggerheart Plus | Failed to register HoverDistance settings",
      e
    );
  }

  try {
    loadTemplates([
      "modules/daggerheart-plus/templates/applications/floating-sheet-rail.hbs",
    ]);
  } catch (e) {
    console.warn("Daggerheart Plus | Failed to preload templates", e);
  }

  try {
    const BaseTooltipManager = CONFIG?.ux?.TooltipManager;
    if (BaseTooltipManager) {
      class DHPTooltipCardManager extends BaseTooltipManager {
        async activate(element, options = {}) {
          console.log(
            "DH+ Tooltip Manager: activate() called",
            element,
            options
          );
          const result = await super.activate(element, options);
          console.log(
            "DH+ Tooltip Manager: super.activate() completed",
            result
          );

          try {
            if (this.tooltip) {
              console.log(
                "DH+ Tooltip Manager: Found tooltip element",
                this.tooltip
              );
              console.log(
                "DH+ Tooltip Manager: Tooltip innerHTML preview:",
                this.tooltip.innerHTML.substring(0, 200)
              );

              this.tooltip.classList.add("dhp-tooltip-card");

              const images = this.tooltip.querySelectorAll(".tooltip-image");
              console.log(
                "DH+ Tooltip Manager: Found images in tooltip:",
                images.length,
                images
              );

              const tooltipEl = this.tooltip;

              const buildKey = () => {
                try {
                  const parts = [];
                  images.forEach((img) => {
                    parts.push(
                      img.getAttribute("src") ||
                        img.currentSrc ||
                        img.dataset?.src ||
                        ""
                    );
                  });
                  const title =
                    tooltipEl
                      .querySelector(".tooltip-title")
                      ?.textContent?.trim() || "";
                  parts.push(title);
                  return parts.join("|");
                } catch (_) {
                  return String(Date.now());
                }
              };

              function updateCountersWrapperDisplay() {
                try {
                  const wrapper = document.getElementById("counters-wrapper");
                  if (!wrapper) return;

                  const fearActive = Boolean(
                    window.daggerheartPlus?.fearTracker?.element
                  );

                  const tokenCountersEnabled = Boolean(
                    game.settings.get(MODULE_ID, "enableTokenCounters")
                  );
                  const hasSelectedToken = Boolean(
                    canvas?.tokens?.controlled?.length
                  );
                  const tokenCountersActive = Boolean(
                    tokenCountersEnabled &&
                      (window.daggerheartPlus?.tokenCounter?.element ||
                        hasSelectedToken)
                  );

                  const shouldShow = fearActive || tokenCountersActive;
                  wrapper.style.display = shouldShow ? "" : "none";
                } catch (e) {}
              }
              const currentKey = buildKey();

              const prevCtrl = tooltipEl._dhpShineCtrl;
              if (prevCtrl && prevCtrl.key !== currentKey) {
                try {
                  if (prevCtrl.startTimer) clearTimeout(prevCtrl.startTimer);
                } catch {}
                try {
                  if (prevCtrl.cleanupTimer)
                    clearTimeout(prevCtrl.cleanupTimer);
                } catch {}
                try {
                  tooltipEl.classList.remove("tooltip-shine");
                } catch {}

                try {
                  prevCtrl.overlays?.forEach?.((el) => el.remove());
                } catch {}
                delete tooltipEl.dataset.dhpShineRunning;
                delete tooltipEl.dataset.dhpShineDone;
                tooltipEl._dhpShineCtrl = null;
              }

              let ctrl = tooltipEl._dhpShineCtrl;
              if (!ctrl || ctrl.key !== currentKey) {
                ctrl = {
                  key: currentKey,
                  overlays: [],
                  running: false,
                  done: false,
                };
                tooltipEl._dhpShineCtrl = ctrl;
              } else if (ctrl.running || ctrl.done) {
                return result;
              }

              ctrl.overlays = [];
              try {
                images.forEach((img) => {
                  const container =
                    img.closest?.(".tooltip-hero") || img.parentElement;
                  if (!container) return;
                  try {
                    const cs = getComputedStyle(container);
                    if (cs?.position === "static")
                      container.style.position = "relative";
                  } catch (_) {
                    if (!container.style.position)
                      container.style.position = "relative";
                  }
                  container
                    .querySelectorAll?.(".tooltip-image-shine")
                    ?.forEach((el) => el.remove());
                  const overlay = document.createElement("div");
                  overlay.className = "tooltip-image-shine";
                  container.appendChild(overlay);
                  ctrl.overlays.push(overlay);
                });
              } catch (e) {
                console.warn(
                  "DH+ Tooltip Manager: Failed to prepare shine overlays",
                  e
                );
              }

              if (!ctrl.overlays.length) return result;

              ctrl.startTimer = setTimeout(() => {
                if (!tooltipEl || tooltipEl._dhpShineCtrl !== ctrl) return;
                if (ctrl.done) return;
                ctrl.running = true;
                tooltipEl.dataset.dhpShineRunning = "1";
                tooltipEl.classList.add("tooltip-shine");

                let remaining = ctrl.overlays.length;
                const finalize = () => {
                  if (!tooltipEl || tooltipEl._dhpShineCtrl !== ctrl) return;
                  if (ctrl.done) return;
                  ctrl.done = true;
                  ctrl.running = false;
                  tooltipEl.classList.remove("tooltip-shine");

                  delete tooltipEl.dataset.dhpShineRunning;
                  tooltipEl.dataset.dhpShineDone = "1";
                  try {
                    ctrl.overlays.forEach((el) => el.remove());
                  } catch {}
                };

                ctrl.overlays.forEach((el) => {
                  const t = setTimeout(finalize, 1300);
                  el.addEventListener(
                    "animationend",
                    () => {
                      clearTimeout(t);
                      remaining -= 1;
                      if (remaining <= 0) finalize();
                    },
                    { once: true }
                  );
                });
              }, 150);
            } else {
              console.log("DH+ Tooltip Manager: No tooltip element found");
            }
          } catch (e) {
            console.error("DH+ Tooltip Manager: Error applying classes", e);
          }
          return result;
        }
      }
      CONFIG.ux.TooltipManager = DHPTooltipCardManager;
      console.log("Daggerheart Plus | Tooltip enhancement applied (init)");
      console.log(
        "DH+ Tooltip Manager: Registered manager",
        CONFIG.ux.TooltipManager
      );

      setTimeout(() => {
        console.log(
          "DH+ Tooltip Manager: Current manager after timeout",
          CONFIG.ux.TooltipManager
        );
        console.log(
          "DH+ Tooltip Manager: Manager is our class?",
          CONFIG.ux.TooltipManager === DHPTooltipCardManager
        );
      }, 5000);
    } else {
      console.warn(
        "Daggerheart Plus | No base tooltip manager found at init; skipping enhancement"
      );
    }
  } catch (e) {
    console.warn("Daggerheart Plus | Failed to enhance tooltips at init", e);
  }
});

Hooks.once("ready", () => {
  try {
    HoverDistance.initHooks();
    console.log("Daggerheart Plus | Hover Distance feature enabled");
  } catch (e) {
    console.warn("Daggerheart Plus | Hover Distance failed to initialize", e);
  }
});

Hooks.once("ready", async () => {
  try {
    const enabled = game.settings.get(MODULE_ID, "enableEnhancedChat");
    applyEnhancedChatStyles(Boolean(enabled));

    try {
      EnhancedChatEffects.init();
    } catch (_) {}
  } catch (e) {
    console.warn(
      "Daggerheart Plus | Failed to apply initial enhanced chat state",
      e
    );
  }

  console.log("Daggerheart Plus | Module ready - creating enhanced sheets");

  const documentSheetConfig = foundry.applications.apps.DocumentSheetConfig;
  const systemAPI = game.system.api?.applications?.sheets?.actors;

  if (!systemAPI) {
    ui.notifications.error("Daggerheart Plus | System API not available");
    return;
  }

  const getDefaultSheetSize = () => ({
    width: Number(game.settings.get(MODULE_ID, "defaultSheetWidth") ?? 900),
    height: Number(game.settings.get(MODULE_ID, "defaultSheetHeight") ?? 800),
  });

  const getDefaultAdversarySheetSize = () => ({
    width: Number(game.settings.get(MODULE_ID, "adversarySheetWidth") ?? 630),
    height: Number(game.settings.get(MODULE_ID, "adversarySheetHeight") ?? 820),
  });

  const applyDefaultSizeToApp = (app, sizeOverride) => {
    try {
      if (!app) return;
      const { width, height } = sizeOverride ?? getDefaultSheetSize();
      if (typeof app.setPosition === "function") {
        app.setPosition({ width, height });
      } else if (app.position) {
        app.position.width = width;
        app.position.height = height;
        if (typeof app.render === "function") app.render(false);
      } else if (app.element) {
        app.element.style.width = `${width}px`;
        app.element.style.height = `${height}px`;
      }
    } catch (e) {
      console.warn(
        "Daggerheart Plus | Failed to apply default size to app",
        app,
        e
      );
    }
  };

  const DaggerheartPlusCharacterSheet = class extends systemAPI.Character {
    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      classes: [...(super.DEFAULT_OPTIONS.classes || []), "daggerheart-plus"],
      position: {
        ...(super.DEFAULT_OPTIONS?.position || {}),
        ...getDefaultSheetSize(),
      },
    };

    constructor(options = {}) {
      super(options);
      this._leftRail = null;
      this._rightRail = null;
    }

    static PARTS = {
      ...super.PARTS,
      sidebar: {
        id: "sidebar",
        template: "modules/daggerheart-plus/templates/character/sidebar.hbs",
      },
      header: {
        id: "header",
        template: "modules/daggerheart-plus/templates/character/header.hbs",
      },
      features: {
        id: "features",
        template: "modules/daggerheart-plus/templates/character/features.hbs",
      },
      loadout: {
        id: "loadout",
        template: "modules/daggerheart-plus/templates/character/loadout.hbs",
      },
      inventory: {
        id: "inventory",
        template: "modules/daggerheart-plus/templates/character/inventory.hbs",
      },
      biography: {
        id: "biography",
        template: "modules/daggerheart-plus/templates/character/biography.hbs",
      },
      effects: {
        id: "effects",
        template: "modules/daggerheart-plus/templates/character/effects.hbs",
      },
    };

    get title() {
      return `${this.document.name} [DH+]`;
    }

    static TABS = [
      { tab: "features", label: "Features", icon: "fas fa-list" },
      { tab: "loadout", label: "Loadout", icon: "fas fa-chess-rook" },
      { tab: "inventory", label: "Inventory", icon: "fas fa-bag-shopping" },
      { tab: "effects", label: "Effects", icon: "fas fa-bolt" },
      { tab: "biography", label: "Biography", icon: "fas fa-feather" },
    ];

    tabGroups = { primary: "features" };

    _getTabs() {
      return this.constructor.TABS.reduce(
        (tabs, { tab, condition, ...config }) => {
          if (!condition || condition(this.document))
            tabs[tab] = {
              ...config,
              id: tab,
              group: "primary",
              active: this.tabGroups.primary === tab,
              cssClass: this.tabGroups.primary === tab ? "active" : "",
            };
          return tabs;
        },
        {}
      );
    }

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.tabs = this._getTabs();
      try {
        context.enableCharacterSheetSidebars = game.settings.get(
          MODULE_ID,
          "enableCharacterSheetSidebars"
        );
      } catch (_) {
        context.enableCharacterSheetSidebars = false;
      }
      return context;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);

      try {
        window.daggerheartPlus?.bindThresholdClicks?.(
          this.element,
          this.document
        );
      } catch (_) {
        try {
          const root = this.element;
          const actor = this.document;
          if (root && actor && !root._dhpThresholdDelegationBound) {
            const clickHandler = (ev) => {
              const el = ev.target?.closest?.(
                '.threshold-text.threshold-clickable[data-action="mark-hp"]'
              );
              if (!el || !root.contains(el)) return;
              const amt = Number(el.dataset.hpAmount) || 0;
              if (!amt) return;
              ev.preventDefault();
              ev.stopPropagation();
              window.daggerheartPlus?.modifyHP?.(actor, "add", amt);
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
              window.daggerheartPlus?.modifyHP?.(actor, "subtract", amt);
            };
            root.addEventListener("click", clickHandler, true);
            root.addEventListener("contextmenu", contextHandler, true);
            root._dhpThresholdDelegationBound = true;
          }
        } catch {}
      }

      try {
        const useRails = game.settings.get(
          MODULE_ID,
          "enableCharacterSheetSidebars"
        );
        if (useRails) await this._mountInlineRails();
        else this._removeInlineRails();
      } catch (_) {
        try {
          this._removeInlineRails();
        } catch {}
      }

      this._applySidebarLoadoutBackgrounds();

      this._attachLoadoutCardTooltips();

      try {
        window.daggerheartPlus?.bindThresholdClicks?.(
          this.element,
          this.document
        );
      } catch {}

      try {
        window.daggerheartPlus?.bindProgressBarClicks?.(
          this.element,
          this.document
        );
      } catch {}
    }

    _applySidebarLoadoutBackgrounds() {
      try {
        const root = this.element;
        if (!root) return;

        const selectors = [
          ".character-sidebar-sheet .loadout-section .items-sidebar-list",
          ".dh-inline-rails.rails-left .loadout-section .items-sidebar-list",
        ];
        const lists = selectors
          .map((sel) => root.querySelector(sel))
          .filter((el) => !!el);
        if (!lists.length) return;

        const apply = (el) => {
          const item = el.closest?.(".inventory-item") || el;
          if (!item || !item.classList.contains("inventory-item")) return;

          let src;
          const itemId = item.dataset.itemId;
          const doc = itemId ? this.document?.items?.get?.(itemId) : null;
          if (doc?.img) src = doc.img;
          if (!src) {
            const imgEl = item.querySelector?.(".item-img, .item-image, img");
            src =
              imgEl?.getAttribute?.("src") ||
              imgEl?.dataset?.src ||
              imgEl?.currentSrc;
          }
          if (!src) return;

          const url = `url("${src}")`;

          item.style.setProperty("--sidebar-card-bg", url);
          item.style.setProperty("background-image", url, "important");
          item.style.setProperty("background-size", "cover", "important");
          item.style.setProperty("background-position", "center", "important");
          item.style.setProperty("background-repeat", "no-repeat", "important");

          const header = item.querySelector(".inventory-item-header");
          if (header) {
            header.style.setProperty("background-image", url, "important");
            header.style.setProperty("background-size", "cover", "important");
            header.style.setProperty(
              "background-position",
              "center",
              "important"
            );
            header.style.setProperty(
              "background-repeat",
              "no-repeat",
              "important"
            );
          }

          try {
            item.setAttribute("data-action", "useItem");
          } catch {}

          try {
            if (!item.hasAttribute("data-tooltip")) {
              const uuid =
                doc?.uuid ||
                (itemId && this.document?.uuid
                  ? `${this.document.uuid}.Item.${itemId}`
                  : null);
              if (uuid) item.setAttribute("data-tooltip", `#item#${uuid}`);
            }
          } catch {}
          item.dataset.bgApplied = "1";
        };

        lists.forEach((list) =>
          list.querySelectorAll(".inventory-item").forEach(apply)
        );

        try {
          if (this._loadoutObserver) this._loadoutObserver.disconnect();
          this._loadoutObserver = new MutationObserver((mutations) => {
            let needsUpdate = false;
            for (const m of mutations) {
              m.addedNodes.forEach((n) => {
                if (n.nodeType === Node.ELEMENT_NODE) {
                  if (n.matches?.(".inventory-item")) {
                    apply(n);
                    needsUpdate = true;
                  } else
                    n.querySelectorAll?.(".inventory-item").forEach((it) => {
                      apply(it);
                      needsUpdate = true;
                    });
                }
              });
            }
            if (needsUpdate)
              lists.forEach((list) =>
                list.querySelectorAll(".inventory-item").forEach(apply)
              );
          });
          lists.forEach((list) =>
            this._loadoutObserver.observe(list, {
              childList: true,
              subtree: true,
            })
          );
        } catch (e) {}
      } catch (_) {}
    }

    _attachLoadoutCardTooltips() {
      try {
        const root = this.element;
        if (!root) return;
        const container = root.querySelector(".tab.loadout");
        if (!container) return;

        const apply = (li) => {
          if (!li || !li.classList?.contains?.("card-item")) return;
          try {
            const uuid = li?.dataset?.itemUuid;
            if (!uuid) return;

            if (!li.hasAttribute("data-tooltip"))
              li.setAttribute("data-tooltip", `#item#${uuid}`);

            const label = li.querySelector(".card-label");
            if (label && !label.hasAttribute("data-tooltip"))
              label.setAttribute("data-tooltip", `#item#${uuid}`);
            const img = li.querySelector("img.card-img, .card-img img, img");
            if (img) {
              if (!img.getAttribute("data-action"))
                img.setAttribute("data-action", "useItem");
              if (!img.hasAttribute("data-tooltip"))
                img.setAttribute("data-tooltip", `#item#${uuid}`);
            }
            const nameEl = li.querySelector(".card-name");
            if (nameEl && !nameEl.hasAttribute("data-tooltip"))
              nameEl.setAttribute("data-tooltip", `#item#${uuid}`);
          } catch (_) {}
        };

        const wireLists = () => {
          const lists = container.querySelectorAll(".card-list");
          if (!lists?.length) return false;
          lists.forEach((ul) =>
            ul.querySelectorAll(".card-item").forEach(apply)
          );

          try {
            if (this._loadoutCardsObserver)
              this._loadoutCardsObserver.disconnect();
            this._loadoutCardsObserver = new MutationObserver((mutations) => {
              for (const m of mutations) {
                m.addedNodes.forEach((n) => {
                  if (n.nodeType === Node.ELEMENT_NODE) {
                    if (n.matches?.(".card-item")) apply(n);
                    n.querySelectorAll?.(".card-item").forEach(apply);
                  }
                });
              }
            });
            lists.forEach((ul) =>
              this._loadoutCardsObserver.observe(ul, {
                childList: true,
                subtree: true,
              })
            );
          } catch (_) {}
          return true;
        };

        if (!wireLists()) {
          try {
            if (this._loadoutCardsBootstrapObserver)
              this._loadoutCardsBootstrapObserver.disconnect();
            this._loadoutCardsBootstrapObserver = new MutationObserver(() => {
              if (wireLists()) {
                try {
                  this._loadoutCardsBootstrapObserver.disconnect();
                } catch {}
                this._loadoutCardsBootstrapObserver = null;
              }
            });
            this._loadoutCardsBootstrapObserver.observe(container, {
              childList: true,
              subtree: true,
            });
          } catch (_) {}
        }
      } catch (_) {}
    }

    _ensureFallbackRailsDOM() {
      try {
        const hasRight =
          this._rightRail?.element &&
          document.body.contains(this._rightRail.element);
        const hasLeft =
          this._leftRail?.element &&
          document.body.contains(this._leftRail.element);
        const rect = this.element?.getBoundingClientRect?.();
        if (!rect) return;

        const make = (side) => {
          const root = document.createElement("nav");
          root.className = "floating-sheet-rail";
          const wrapper = document.createElement("div");
          wrapper.className = `floating-rail floating-rail-${side}`;
          if (side === "right") {
            const buttons = document.createElement("div");
            buttons.className = "rail-buttons";
            buttons.innerHTML = `
              <button type="button" class="rail-btn" title="A"><i class="fa-solid fa-sparkles"></i></button>
              <button type="button" class="rail-btn" title="B"><i class="fa-solid fa-shield-halved"></i></button>
              <button type="button" class="rail-btn" title="C"><i class="fa-solid fa-bag-shopping"></i></button>
              <button type="button" class="rail-btn" title="D"><i class="fa-solid fa-user"></i></button>
              <button type="button" class="rail-btn" title="E"><i class="fa-solid fa-hourglass"></i></button>`;
            wrapper.appendChild(buttons);
          } else {
            const pill = document.createElement("div");
            pill.className = "rail-pill";
            pill.innerHTML = `
              <div class="pill-item">Domain</div>
              <div class="pill-item">Class</div>
              <div class="pill-item">Subclass</div>
              <div class="pill-item">Community</div>
              <div class="pill-item">Ancestry</div>`;
            wrapper.appendChild(pill);
          }
          const note = document.createElement("span");
          note.className = "rail-placeholder-note";
          note.textContent = "Placeholder â€“ future features";
          wrapper.appendChild(note);
          root.appendChild(wrapper);
          document.body.appendChild(root);

          const applyPos = () => {
            root.style.position = "fixed";
            root.style.zIndex = "1000";
            if (side === "right") {
              root.style.left = "";
              root.style.right = `${Math.max(
                0,
                window.innerWidth - rect.right + 20
              )}px`;
              root.style.top = `${rect.top + rect.height / 2}px`;
              root.style.transform = "translateY(-50%)";
            } else {
              const width = root.getBoundingClientRect().width || 0;
              const targetRight = rect.left - 20;
              const left = Math.max(0, targetRight - width);
              root.style.right = "";
              root.style.left = `${left}px`;
              root.style.top = `${rect.top + rect.height / 2}px`;
              root.style.transform = "translateY(-50%)";
            }
          };
          applyPos();
          const onResize = () => applyPos();
          window.addEventListener("resize", onResize);

          if (side === "right") this.__fallbackRight = { root, onResize };
          else this.__fallbackLeft = { root, onResize };
        };

        if (!hasRight && !this.__fallbackRight) make("right");
        if (!hasLeft && !this.__fallbackLeft) make("left");
      } catch {}
    }

    _cleanupFallbackRailsDOM() {
      try {
        if (this.__fallbackRight) {
          window.removeEventListener("resize", this.__fallbackRight.onResize);
          this.__fallbackRight.root.remove();
          this.__fallbackRight = null;
        }
        if (this.__fallbackLeft) {
          window.removeEventListener("resize", this.__fallbackLeft.onResize);
          this.__fallbackLeft.root.remove();
          this.__fallbackLeft = null;
        }
      } catch {}
    }

    async close(options = {}) {
      try {
        this._removeInlineRails();
      } catch {}
      try {
        this._loadoutCardsObserver?.disconnect?.();
      } catch {}
      this._loadoutCardsObserver = null;
      try {
        this._loadoutCardsBootstrapObserver?.disconnect?.();
      } catch {}
      this._loadoutCardsBootstrapObserver = null;
      return super.close(options);
    }

    async _mountInlineRails() {
      try {
        const root = this.element;
        if (!root) return;

        this._removeInlineRails();

        const right = document.createElement("div");
        right.className = "dh-inline-rails rails-right";

        const left = document.createElement("div");
        left.className = "dh-inline-rails rails-left";

        const tabs = Object.values(this._getTabs?.() ?? {});
        const leftItems = [
          { key: "domain", label: "Domain" },
          { key: "class", label: "Class" },
          { key: "subclass", label: "Subclass" },
          { key: "community", label: "Community" },
          { key: "ancestry", label: "Ancestry" },
        ];

        const templatePath =
          "modules/daggerheart-plus/templates/applications/floating-sheet-rail.hbs";
        const [rightHTML, leftHTML] = await Promise.all([
          foundry.applications.handlebars.renderTemplate(templatePath, {
            side: "right",
            tabs,
          }),
          foundry.applications.handlebars.renderTemplate(templatePath, {
            side: "left",
            items: leftItems,
            document: this.document,
          }),
        ]);

        right.innerHTML = rightHTML;
        left.innerHTML = leftHTML;

        root.appendChild(right);
        root.appendChild(left);
        this.__inlineRails = { right, left };

        try {
          const nav = right.querySelector(".rail-nav");
          if (nav) {
            nav.addEventListener("click", (ev) => {
              const a = ev.target.closest("a[data-tab]");
              if (!a) return;
              ev.preventDefault();
              ev.stopPropagation();
              const id = a.dataset.tab;
              try {
                this.tabGroups = this.tabGroups || { primary: "features" };
                this.tabGroups.primary = id;

                const sections = this.element.querySelectorAll(
                  '.tab[data-group="primary"]'
                );
                sections.forEach((sec) => {
                  const active = sec.dataset.tab === id;
                  sec.classList.toggle("active", active);
                });

                for (const el of nav.querySelectorAll("a[data-tab]")) {
                  el.classList.toggle("active", el === a);
                }
              } catch (e) {}
            });
          }
        } catch (_) {}
      } catch (e) {}
    }

    _removeInlineRails() {
      try {
        this.__inlineRails?.right?.remove?.();
        this.__inlineRails?.left?.remove?.();
        this.__inlineRails = null;
      } catch {}
    }
  };

  const DaggerheartPlusAdversarySheet = class extends systemAPI.Adversary {
    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      classes: [...(super.DEFAULT_OPTIONS.classes || []), "daggerheart-plus"],
      position: {
        ...(super.DEFAULT_OPTIONS?.position || {}),
        ...getDefaultAdversarySheetSize(),
      },
    };

    static PARTS = {
      ...super.PARTS,
      sidebar: {
        id: "sidebar",
        template: "modules/daggerheart-plus/templates/adversary/sidebar.hbs",
      },
      header: {
        id: "header",
        template: "modules/daggerheart-plus/templates/adversary/header.hbs",
      },
      features: {
        id: "features",
        template: "modules/daggerheart-plus/templates/adversary/features.hbs",
      },
      effects: {
        id: "effects",
        template: "modules/daggerheart-plus/templates/adversary/effects.hbs",
      },
      notes: {
        id: "notes",
        template: "modules/daggerheart-plus/templates/adversary/notes.hbs",
      },
    };

    get title() {
      return `${this.document.name} [DH+]`;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      try {
        window.daggerheartPlus?.bindThresholdClicks?.(
          this.element,
          this.document
        );
      } catch (_) {
        try {
          const root = this.element;
          const actor = this.document;
          if (root && actor) {
            root
              .querySelectorAll(
                '.threshold-text.threshold-clickable[data-action="mark-hp"]'
              )
              .forEach((el) => {
                const amt = Number(el.dataset.hpAmount) || 0;
                if (!amt) return;
                el.addEventListener("click", (ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  window.daggerheartPlus?.modifyHP?.(actor, "add", amt);
                });
                el.addEventListener("contextmenu", (ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  window.daggerheartPlus?.modifyHP?.(actor, "subtract", amt);
                });
              });
          }
        } catch {}
      }

      try {
        window.daggerheartPlus?.bindAdversaryDifficultyClick?.(
          this.element,
          this.document
        );
      } catch (_) {
        try {
          const root = this.element;
          const actor = this.document;
          if (root && actor && !root._dhpDifficultyDelegationBound) {
            const handler = (ev) => {
              const el = ev.target?.closest?.(
                '[data-action="requestDifficultyRoll"]'
              );
              if (!el || !root.contains(el)) return;
              ev.preventDefault();
              ev.stopPropagation();
              window.daggerheartPlus?.sendDifficultyRollRequest?.(actor);
            };
            root.addEventListener("click", handler, true);
            root._dhpDifficultyDelegationBound = true;
          }
        } catch {}
      }

      try {
        window.daggerheartPlus?.bindProgressBarClicks?.(
          this.element,
          this.document
        );
      } catch {}
    }
  };

  const DaggerheartPlusCompanionSheet = class extends systemAPI.Companion {
    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      classes: [...(super.DEFAULT_OPTIONS.classes || []), "daggerheart-plus"],
      position: {
        ...(super.DEFAULT_OPTIONS?.position || {}),
        ...getDefaultSheetSize(),

        width: 340,
      },
    };

    static PARTS = {
      ...super.PARTS,
      header: {
        id: "header",
        template: "modules/daggerheart-plus/templates/companion/header.hbs",
      },
      details: {
        id: "details",
        template: "modules/daggerheart-plus/templates/companion/details.hbs",
      },
      effects: {
        id: "effects",
        template: "modules/daggerheart-plus/templates/companion/effects.hbs",
      },
    };

    get title() {
      return `${this.document.name} [DH+]`;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      try {
        window.daggerheartPlus?.bindProgressBarClicks?.(
          this.element,
          this.document
        );
      } catch {}
    }
  };

  const DaggerheartPlusEnvironmentSheet = class extends systemAPI.Environment {
    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      classes: [...(super.DEFAULT_OPTIONS.classes || []), "daggerheart-plus"],
      position: {
        ...(super.DEFAULT_OPTIONS?.position || {}),
        ...getDefaultSheetSize(),
      },
    };

    get title() {
      return `${this.document.name} [DH+]`;
    }
  };

  documentSheetConfig.registerSheet(
    Actor,
    SYSTEM_ID,
    DaggerheartPlusCharacterSheet,
    {
      types: ["character"],
      label: "DH+ Character Sheet",
      makeDefault: true,
    }
  );

  documentSheetConfig.registerSheet(
    Actor,
    SYSTEM_ID,
    DaggerheartPlusAdversarySheet,
    {
      types: ["adversary"],
      label: "DH+ Adversary Sheet",
      makeDefault: true,
    }
  );

  documentSheetConfig.registerSheet(
    Actor,
    SYSTEM_ID,
    DaggerheartPlusCompanionSheet,
    {
      types: ["companion"],
      label: "DH+ Companion Sheet",
      makeDefault: true,
    }
  );

  documentSheetConfig.registerSheet(
    Actor,
    SYSTEM_ID,
    DaggerheartPlusEnvironmentSheet,
    {
      types: ["environment"],
      label: "DH+ Environment Sheet",
      makeDefault: true,
    }
  );

  console.log("Daggerheart Plus | Enhanced sheets registered successfully");

  EnhancedDiceStyling.initialize();

  async function modifyHP(actor, operation, amount) {
    try {
      if (!actor) return;
      const current =
        Number(actor.system?.resources?.hitPoints?.value ?? 0) || 0;
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

  function bindThresholdClicks(root, actor) {
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

  async function sendDifficultyRollRequest(actor, options = {}) {
    try {
      if (!actor) return;
      const diff = Number(actor.system?.difficulty ?? 0) || 0;
      if (!diff) {
        ui.notifications?.warn?.("No difficulty set for this adversary.");
        return;
      }
      const title = options.title || `${actor.name}” | Difficulty ${diff}`;
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

  function bindAdversaryDifficultyClick(root, actor) {
    try {
      if (!root || !actor) return;
      if (root._dhpDifficultyDelegationBound) return;
      const handler = (ev) => {
        const el = ev.target?.closest?.(
          '[data-action="requestDifficultyRoll"]'
        );
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

  window.daggerheartPlus = {
    fearTracker: null,
    tokenCounter: null,
    manageFearTracker: null,
    manageTokenCounters: null,
    enhancedDiceStyling: EnhancedDiceStyling,
    modifyHP,
    bindThresholdClicks,
    sendDifficultyRollRequest,
    bindAdversaryDifficultyClick,
    bindProgressBarClicks,
  };

  console.log(
    "Daggerheart Plus | Token counter and enhanced dice styling initialized"
  );

  async function manageFearTracker() {
    try {
      const useFearTracker = game.settings.get(MODULE_ID, "enableFearTracker");

      if (useFearTracker) {
        console.log("Daggerheart Plus | Fear tracker enabled");

        if (!window.daggerheartPlus.fearTracker) {
          window.daggerheartPlus.fearTracker = new CounterUI();
          await window.daggerheartPlus.fearTracker.initialize();
        }
        window.daggerheartPlus.fearTracker.render();
      } else {
        if (window.daggerheartPlus.fearTracker) {
          window.daggerheartPlus.fearTracker.dispose();

          updateCountersWrapperDisplay();
        }
      }
    } catch (error) {
      console.error("Daggerheart Plus | Error managing fear tracker:", error);
    }
  }

  window.daggerheartPlus.manageFearTracker = manageFearTracker;

  async function manageTokenCounters() {
    try {
      const enabled = game.settings.get(MODULE_ID, "enableTokenCounters");
      if (enabled) {
        if (!window.daggerheartPlus.tokenCounter) {
          const tc = new TokenCounterUI();
          await tc.initialize();
          window.daggerheartPlus.tokenCounter = tc;
        }

        try {
          updateCountersWrapperDisplay();
        } catch (_) {}
      } else {
        try {
          window.daggerheartPlus.tokenCounter?.hide?.();
        } catch (_) {}
        try {
          window.daggerheartPlus.tokenCounter?.dispose?.();
        } catch (_) {}

        updateCountersWrapperDisplay();
      }
    } catch (e) {
      console.error("Daggerheart Plus | Error managing token counters:", e);
    }
  }

  window.daggerheartPlus.manageTokenCounters = manageTokenCounters;

  await manageFearTracker();
  await manageTokenCounters();
  try {
    applyTokenCountersVisibilityBySetting();
  } catch (_) {}

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

    if (setting.key === "enableEnhancedChat") {
      try {
        applyEnhancedChatStyles(Boolean(setting.value));
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed applying enhanced chat toggle (updateSetting)",
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
    }
  });

  if (game.user.isGM) {
    ui.notifications.info("Daggerheart Plus module loaded successfully!");
  }

  function bindProgressBarClicks(root, actor) {
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
            if (
              foundry.utils.hasProperty(actor.system, "resources.armor.value")
            ) {
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
});

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
    insertHeader("enableHoverDistance", "Hover Distance");
    insertHeader("hpGradient", "Styling: Progress Bar Gradients");
  } catch (e) {
    console.warn("Daggerheart Plus | Failed injecting settings headers", e);
  }
});

Hooks.on("renderActorSheet", (app, html, data) => {
  if (app.constructor.name.startsWith("DaggerheartPlus")) {
    console.log(`Daggerheart Plus | Rendering ${app.constructor.name}`);
  }

  if (app.constructor.name === "DaggerheartPlusCharacterSheet") {
    try {
      const useRails = game.settings.get(
        MODULE_ID,
        "enableCharacterSheetSidebars"
      );
      console.debug("[DH+] renderActorSheet hook: sidebar rails", {
        app: app.id,
        useRails,
      });
      if (useRails) {
        if (typeof app._mountInlineRails === "function")
          app._mountInlineRails();
      } else {
        if (typeof app._removeInlineRails === "function")
          app._removeInlineRails();
      }
    } catch (_) {
      console.error(
        "[DH+] renderActorSheet hook: failed to ensure inline rails",
        _
      );
    }
  }

  try {
    const actor = app.document || app.object;
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

(function () {
  const MOD = "daggerheart-plus";

  function buildLinearGradient(colors) {
    const cs = (colors || [])
      .filter(Boolean)
      .map((c) => c.trim())
      .filter((c) => c.length);
    if (!cs.length) return null;
    const n = cs.length - 1;
    const stops = cs.map((c, i) => {
      const pct = n <= 0 ? 100 * i : Math.round((i / n) * 100);
      return `${c} ${pct}%`;
    });
    return `linear-gradient(90deg, ${stops.join(", ")})`;
  }

  function parseColorList(str) {
    if (!str || typeof str !== "string") return [];

    const raw = str
      .split(/[\s,]+/g)
      .map((s) => s.trim())
      .filter(Boolean);

    const ok = raw.filter(
      (c) =>
        /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(c) ||
        /^rgb(a)?\(/i.test(c) ||
        /^hsl(a)?\(/i.test(c) ||
        /^var\(/i.test(c)
    );
    return ok;
  }

  function applyProgressBarGradients() {
    try {
      const hpStr = String(game.settings.get(MOD, "hpGradient") ?? "").trim();
      const stressStr = String(
        game.settings.get(MOD, "stressGradient") ?? ""
      ).trim();
      const armorStr = String(
        game.settings.get(MOD, "armorGradient") ?? ""
      ).trim();

      const hpG = buildLinearGradient(parseColorList(hpStr));
      const stressG = buildLinearGradient(parseColorList(stressStr));
      const armorG = buildLinearGradient(parseColorList(armorStr));

      const id = "dhp-progress-gradients";
      let style = document.getElementById(id);
      if (!style) {
        style = document.createElement("style");
        style.id = id;
        document.head.appendChild(style);
      }
      const lines = [];
      lines.push(".daggerheart-plus.sheet{");
      if (hpG) lines.push("--dhp-damage-gradient:" + hpG + ";");
      if (stressG) lines.push("--dhp-stress-gradient:" + stressG + ";");
      if (armorG) lines.push("--dhp-armor-gradient:" + armorG + ";");
      lines.push("}");
      style.textContent = lines.join("");
    } catch (e) {
      console.warn("Daggerheart Plus | Failed applying gradient settings", e);
    }
  }

  Hooks.once("init", () => {
    try {
      game.settings.register(MOD, "hpGradient", {
        name: "DHP.Settings.ProgressGradients.HP.Name",
        hint: "DHP.Settings.ProgressGradients.HP.Hint",
        scope: "client",
        config: true,
        type: String,
        default: "",
        onChange: () => applyProgressBarGradients(),
      });
      game.settings.register(MOD, "stressGradient", {
        name: "DHP.Settings.ProgressGradients.Stress.Name",
        hint: "DHP.Settings.ProgressGradients.Stress.Hint",
        scope: "client",
        config: true,
        type: String,
        default: "",
        onChange: () => applyProgressBarGradients(),
      });
      game.settings.register(MOD, "armorGradient", {
        name: "DHP.Settings.ProgressGradients.Armor.Name",
        hint: "DHP.Settings.ProgressGradients.Armor.Hint",
        scope: "client",
        config: true,
        type: String,
        default: "",
        onChange: () => applyProgressBarGradients(),
      });
    } catch (e) {
      console.error(
        "Daggerheart Plus | Failed registering gradient settings",
        e
      );
    }
  });

  Hooks.on("ready", () => applyProgressBarGradients());

  Hooks.on("updateSetting", (setting) => {
    if (setting?.namespace !== MOD) return;
    if (
      ["hpGradient", "stressGradient", "armorGradient"].includes(setting?.key)
    ) {
      applyProgressBarGradients();
    }
  });
})();

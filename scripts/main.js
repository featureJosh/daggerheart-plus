import { CounterUI } from "./applications/counter-ui.js";
import { TokenCounterUI } from "./applications/token-counter-ui.js";
import { EnhancedDiceStyling } from "./applications/enhanced-dice-styling.js";
import { HoverDistance } from "./applications/hover-distance.js";

const MODULE_ID = "daggerheart-plus";
const SYSTEM_ID = "daggerheart";

// Utility: add or remove the enhanced chat stylesheet link
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

  // Toggle for Token Counters UI (world)
  game.settings.register(MODULE_ID, "enableTokenCounters", {
    name: "Enable Token Counters",
    hint: "Enables the token counters UI (HP, Hope, Stress, Armor) displayed near the hotbar for the currently selected token.",
    scope: "world",
    config: true,
    type: Boolean,
    // Maintain previous behavior (counters were always on before)
    default: true,
    onChange: (value) => {
      try {
        console.log(
          "Daggerheart Plus | Token counters setting changed:",
          value
        );
        if (window.daggerheartPlus?.manageTokenCounters) {
          window.daggerheartPlus.manageTokenCounters();
        }
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed applying token counters toggle",
          e
        );
      }
    },
  });

  // Per-user toggle for Character Sheet inline rails (sidebars)
  game.settings.register(MODULE_ID, "enableCharacterSheetSidebars", {
    name: "Character Sheet Sidebars (Rails)",
    hint: "Show left/right inline rails on DH+ Character sheets. Per-user preference only.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      try {
        // Apply immediately to any open DH+ Character sheets for this user
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

  // Default DH+ sheet size (global)
  game.settings.register(MODULE_ID, "defaultSheetWidth", {
    name: "Default DH+ Sheet Width (px)",
    hint: "Default width applied to DH+ actor sheets (Character, Adversary, Companion, Environment). Reopen sheets to apply if not updated automatically.",
    scope: "world",
    // Hidden for now; keep for future use
    config: false,
    type: Number,
    default: 900,
    range: { min: 400, max: 2000, step: 10 },
  });

  game.settings.register(MODULE_ID, "defaultSheetHeight", {
    name: "Default DH+ Sheet Height (px)",
    hint: "Default height applied to DH+ actor sheets (Character, Adversary, Companion, Environment). Reopen sheets to apply if not updated automatically.",
    scope: "world",
    // Hidden for now; keep for future use
    config: false,
    type: Number,
    default: 800,
    range: { min: 300, max: 1600, step: 10 },
  });

  // Default DH+ Adversary sheet size (specific)
  game.settings.register(MODULE_ID, "adversarySheetWidth", {
    name: "Default DH+ Adversary Width (px)",
    hint: "Default width applied to DH+ Adversary sheets.",
    scope: "world",
    // Hidden for now; keep for future use
    config: false,
    type: Number,
    default: 630,
    range: { min: 400, max: 2000, step: 10 },
  });

  game.settings.register(MODULE_ID, "adversarySheetHeight", {
    name: "Default DH+ Adversary Height (px)",
    hint: "Default height applied to DH+ Adversary sheets.",
    scope: "world",
    // Hidden for now; keep for future use
    config: false,
    type: Number,
    default: 820,
    range: { min: 300, max: 1600, step: 10 },
  });

  console.log("Daggerheart Plus | Module settings registered");

  // Per-user toggle for Enhanced Chat styling
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

  // Register Hover Distance settings
  try {
    HoverDistance.registerSettings();
  } catch (e) {
    console.warn(
      "Daggerheart Plus | Failed to register HoverDistance settings",
      e
    );
  }

  // Preload HBS templates used by inline rails
  try {
    loadTemplates([
      "modules/daggerheart-plus/templates/applications/floating-sheet-rail.hbs",
    ]);
  } catch (e) {
    console.warn("Daggerheart Plus | Failed to preload templates", e);
  }

  // Enhance tooltips with card-like presentation, preserving system behavior
  // Do this at init so Foundry instantiates our manager, not the system's
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

              // Build a content signature so the shine plays for new content
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
              const currentKey = buildKey();

              // Controller to manage pending timers/cleanup across rapid hovers
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

              // If we already handled this exact content and it's done, allow replay on new hover by resetting on activation
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
                // Already running/done for this exact content instance
                return result;
              }

              // Prepare shine overlays for each image, plus hovered trigger when applicable
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

                // Removed hovered trigger shine overlay per user feedback
              } catch (e) {
                console.warn(
                  "DH+ Tooltip Manager: Failed to prepare shine overlays",
                  e
                );
              }

              if (!ctrl.overlays.length) return result;

              // Schedule start after 150ms; cancel if content changes again
              ctrl.startTimer = setTimeout(() => {
                if (!tooltipEl || tooltipEl._dhpShineCtrl !== ctrl) return;
                if (ctrl.done) return;
                ctrl.running = true;
                tooltipEl.dataset.dhpShineRunning = "1";
                tooltipEl.classList.add("tooltip-shine");
                // Removed hovered trigger shine class per user feedback

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

      // Test if we can access the manager later
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

// Activate Hover Distance hooks once Foundry is ready
Hooks.once("ready", () => {
  try {
    HoverDistance.initHooks();
    console.log("Daggerheart Plus | Hover Distance feature enabled");
  } catch (e) {
    console.warn("Daggerheart Plus | Hover Distance failed to initialize", e);
  }
});

Hooks.once("ready", async () => {
  // Apply initial state of Enhanced Chat stylesheet by injecting/removing link
  try {
    const enabled = game.settings.get(MODULE_ID, "enableEnhancedChat");
    applyEnhancedChatStyles(Boolean(enabled));
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
        // Last resort style application
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

    // --- Tabs Implementation ---
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

      // Bind threshold HP quick marks in header (1/2/3 HP)
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

      // Conditionally mount inline rails per-user, then apply backgrounds so
      // left-rail cards (if present) also get painted.
      try {
        const useRails = game.settings.get(
          MODULE_ID,
          "enableCharacterSheetSidebars"
        );
        if (useRails) await this._mountInlineRails();
        else this._removeInlineRails();
      } catch (_) {
        // Fallback: ensure rails are not duplicated
        try {
          this._removeInlineRails();
        } catch {}
      }

      // Apply loadout backgrounds
      this._applySidebarLoadoutBackgrounds();
      // Ensure card-style loadout items have rich tooltips
      this._attachLoadoutCardTooltips();

      // Re-bind to catch any late-rendered header content
      try {
        window.daggerheartPlus?.bindThresholdClicks?.(
          this.element,
          this.document
        );
      } catch {}

      // Bind progress bar click handlers (HP, Stress, Armor)
      try {
        window.daggerheartPlus?.bindProgressBarClicks?.(
          this.element,
          this.document
        );
      } catch {}
    }

    // Remove custom section toggling; rely on system navigation

    /**
     * Minimal: read each loadout item's image and expose it as a CSS var
     * on the list item so CSS can paint the card background.
     */
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

          // Try to resolve the image source in a few ways:
          // 1) Prefer the owning document's image via data-item-id
          // 2) Fallback to the inline <img> inside the card (src/data-src/currentSrc)
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
          // CSS variable + direct background (with important) to defeat shorthands
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

          // Ensure cards are usable: mark them as actionable
          try {
            item.setAttribute("data-action", "useItem");
          } catch {}

          // Attach rich tooltip when possible using system manager patterns
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

        // Initial paint for both sections
        lists.forEach((list) =>
          list.querySelectorAll(".inventory-item").forEach(apply)
        );

        // Observe both lists for dynamic changes
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
        } catch (e) {
          /* ignore */
        }
      } catch (_) {
        /* noop */
      }
    }

    /**
     * Attach Dh tooltip data to card-style loadout items in the main Loadout tab.
     * Works even if the card lists render after the sheet, and on dynamic updates.
     */
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
            // Attach to LI to catch overlay hovers
            if (!li.hasAttribute("data-tooltip"))
              li.setAttribute("data-tooltip", `#item#${uuid}`);
            // Also attach to overlay label and image
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
          // Position
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
          // Track for cleanup
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
        // Remove any existing
        this._removeInlineRails();

        const right = document.createElement("div");
        right.className = "dh-inline-rails rails-right";

        const left = document.createElement("div");
        left.className = "dh-inline-rails rails-left";

        // Prepare context
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
        // Wire rail nav clicks to switch tabs (without Foundry's Tabs controller)
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
                // Update in-memory state
                this.tabGroups = this.tabGroups || { primary: "features" };
                this.tabGroups.primary = id;

                // Toggle tab content visibility
                const sections = this.element.querySelectorAll(
                  '.tab[data-group="primary"]'
                );
                sections.forEach((sec) => {
                  const active = sec.dataset.tab === id;
                  sec.classList.toggle("active", active);
                });

                // Update active classes in rail nav
                for (const el of nav.querySelectorAll("a[data-tab]")) {
                  el.classList.toggle("active", el === a);
                }
              } catch (e) {
                //console.warn('[DH+] Rail nav tab switch failed', id, e);
              }
            });
          }
        } catch (_) {}
        //console.debug("[DH+] Mounted inline rails inside sheet", this.id);
      } catch (e) {
        //console.error("[DH+] _mountInlineRails failed", e);
      }
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
        // Inline fallback: simple binder if helper isn't present yet
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

      // Bind adversary Difficulty click â†’ send roll request
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

      // Bind progress bar click handlers (HP, Stress)
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

  // Token counters are managed by a setting; initialize conditionally later

  EnhancedDiceStyling.initialize();

  // Generic HP modification helper
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

  // Utility to bind threshold click handlers within a sheet root element
  function bindThresholdClicks(root, actor) {
    try {
      if (!root || !actor) return;

      // Avoid rebinding multiple times per sheet element
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

      // Use capture phase to be resilient to internal handlers
      root.addEventListener("click", clickHandler, true);
      root.addEventListener("contextmenu", contextHandler, true);
      root._dhpThresholdDelegationBound = true;
    } catch (e) {
      console.warn("Daggerheart Plus | bindThresholdClicks failed", e);
    }
  }

  // Create a chat message with a clickable roll request using the system's /dr enricher
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

  // Bind clicks on the Difficulty display within an Adversary sheet
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
          window.daggerheartPlus.fearTracker = null;
        }
      }
    } catch (error) {
      console.error("Daggerheart Plus | Error managing fear tracker:", error);
    }
  }

  window.daggerheartPlus.manageFearTracker = manageFearTracker;

  // Manage Token Counters visibility and lifecycle
  async function manageTokenCounters() {
    try {
      const enabled = game.settings.get(MODULE_ID, "enableTokenCounters");
      if (enabled) {
        if (!window.daggerheartPlus.tokenCounter) {
          const tc = new TokenCounterUI();
          await tc.initialize();
          window.daggerheartPlus.tokenCounter = tc;
        }
        // Ensure visible if a token is selected
        try {
          window.daggerheartPlus.tokenCounter.show?.();
        } catch (_) {}
      } else {
        // Hide and dispose
        try {
          window.daggerheartPlus.tokenCounter?.hide?.();
        } catch (_) {}
        try {
          window.daggerheartPlus.tokenCounter?.dispose?.();
        } catch (_) {}
        window.daggerheartPlus.tokenCounter = null;
      }
    } catch (e) {
      console.error("Daggerheart Plus | Error managing token counters:", e);
    }
  }

  window.daggerheartPlus.manageTokenCounters = manageTokenCounters;

  await manageFearTracker();
  await manageTokenCounters();

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

  // Bind click/right-click on resource progress bars to increment/decrement values
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
          // Find equipped armor item
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
          if (next === current) return true; // no change but handled
          await armorItem.update({ "system.marks.value": next });
          // Keep actor armor resource in sync when present
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
          // Look for an input with a system-backed name
          const input = container.querySelector(
            'input.bar-input, input.armor-marks-input, input[name^="system."]'
          );
          if (input?.name?.startsWith("system."))
            field = input.name.replace(/^system\./, "");
          else if (input?.name) field = input.name;
        }
        if (!field) {
          // Infer from label text if present
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
        // Bounds
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
          // Prefer adjusting equipped armor marks for characters
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

// Inject non-interactive section headers into the Settings UI
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

  // Ensure inline rails exist for DH+ Character sheets (per-user setting)
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

  // Bind progress bar clicks for any DH+ sheet to ensure interactivity
  try {
    const actor = app.document || app.object;
    if (actor && app.element) {
      window.daggerheartPlus?.bindProgressBarClicks?.(app.element, actor);
    }
  } catch (_) {}

  // Lock down Companion sheet resizing behavior
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
    } catch (_) {
      /* noop */
    }
  }
});

Hooks.on("closeActorSheet", async (app) => {
  if (app?.constructor?.name !== "DaggerheartPlusCharacterSheet") return;
  try {
    app._removeInlineRails?.();
  } catch {}
});

// --- DH+ Per-client Progress Bar Gradient Settings ---
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
    // Accept comma/space separated list
    const raw = str
      .split(/[\s,]+/g)
      .map((s) => s.trim())
      .filter(Boolean);
    // Basic sanitization: ensure colors look like hex/rgb/hsl or var(--x)
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

import { CounterUI } from "./applications/counter-ui.js";
import { TokenCounterUI } from "./applications/token-counter-ui.js";
import { EnhancedDiceStyling } from "./applications/enhanced-dice-styling.js";

const MODULE_ID = "daggerheart-plus";
const SYSTEM_ID = "daggerheart";

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
    config: true,
    type: Number,
    default: 900,
    range: { min: 400, max: 2000, step: 10 },
  });

  game.settings.register(MODULE_ID, "defaultSheetHeight", {
    name: "Default DH+ Sheet Height (px)",
    hint: "Default height applied to DH+ actor sheets (Character, Adversary, Companion, Environment). Reopen sheets to apply if not updated automatically.",
    scope: "world",
    config: true,
    type: Number,
    default: 800,
    range: { min: 300, max: 1600, step: 10 },
  });

  // Default DH+ Adversary sheet size (specific)
  game.settings.register(MODULE_ID, "adversarySheetWidth", {
    name: "Default DH+ Adversary Width (px)",
    hint: "Default width applied to DH+ Adversary sheets.",
    scope: "world",
    config: true,
    type: Number,
    default: 630,
    range: { min: 400, max: 2000, step: 10 },
  });

  game.settings.register(MODULE_ID, "adversarySheetHeight", {
    name: "Default DH+ Adversary Height (px)",
    hint: "Default height applied to DH+ Adversary sheets.",
    scope: "world",
    config: true,
    type: Number,
    default: 820,
    range: { min: 300, max: 1600, step: 10 },
  });

  console.log("Daggerheart Plus | Module settings registered");

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
          const result = await super.activate(element, options);
          try {
            if (this.tooltip) this.tooltip.classList.add("dhp-tooltip-card");
          } catch (_) {}
          return result;
        }
      }
      CONFIG.ux.TooltipManager = DHPTooltipCardManager;
      console.log("Daggerheart Plus | Tooltip enhancement applied (init)");
    } else {
      console.warn(
        "Daggerheart Plus | No base tooltip manager found at init; skipping enhancement"
      );
    }
  } catch (e) {
    console.warn("Daggerheart Plus | Failed to enhance tooltips at init", e);
  }
});

Hooks.once("ready", async () => {
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

      // Apply background images to loadout items in both sidebar and left rail
      this._applySidebarLoadoutBackgrounds();
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
              const uuid = doc?.uuid || (itemId && this.document?.uuid ? `${this.document.uuid}.Item.${itemId}` : null);
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
          note.textContent = "Placeholder – future features";
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
          renderTemplate(templatePath, { side: "right", tabs }),
          renderTemplate(templatePath, {
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

  const tokenCounter = new TokenCounterUI();
  await tokenCounter.initialize();

  EnhancedDiceStyling.initialize();

  window.daggerheartPlus = {
    fearTracker: null,
    tokenCounter,
    manageFearTracker: null,
    enhancedDiceStyling: EnhancedDiceStyling,
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

  await manageFearTracker();

  Hooks.on("updateSetting", async (setting) => {
    if (setting.namespace !== MODULE_ID) return;

    

    if (setting.key === "enableFearTracker") {
      await manageFearTracker();
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

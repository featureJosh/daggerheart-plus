import { MODULE_ID, SYSTEM_ID } from "../constants.js";
import { UIOverlayParticles } from "../../applications/ui-overlay-particles.js";

export function getDefaultSheetSize() {
  return {
    width: Number(game.settings.get(MODULE_ID, "defaultSheetWidth") ?? 900),
    height: Number(game.settings.get(MODULE_ID, "defaultSheetHeight") ?? 800),
  };
}

export function getDefaultAdversarySheetSize() {
  return {
    width: Number(game.settings.get(MODULE_ID, "adversarySheetWidth") ?? 630),
    height: Number(game.settings.get(MODULE_ID, "adversarySheetHeight") ?? 820),
  };
}

export function applyDefaultSizeToApp(app, sizeOverride) {
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
}

export function registerDaggerheartPlusSheets() {
  const documentSheetConfig = foundry.applications.apps.DocumentSheetConfig;
  const systemAPI = game.system.api?.applications?.sheets?.actors;

  if (!systemAPI) {
    ui.notifications.error("Daggerheart Plus | System API not available");
    return;
  }

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
      { tab: "inventory", label: "Inventory", icon: "fas fa-backpack" },
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

      // Spellcasting trait: mark tile and bind quick-cast
      try {
        const root = this.element;
        if (root) {
          const traitKey =
            this.document?.system?.class?.subclass?.system?.spellcastingTrait ||
            this.document?.system?.class?.value?.system?.spellcastingTrait ||
            this.document?.system?.class?.system?.spellcastingTrait ||
            this.document?.system?.spellcastingTrait ||
            this.document?.flags?.daggerheart?.spellcastingTrait ||
            this.document?.flags?.[MODULE_ID]?.spellcastingTrait;

          const ensureMarked = () => {
            try {
              if (!traitKey) return false;
              const scContainer = root.querySelector(
                `.attributes-row .attribute-container[data-attribute="${traitKey}"]`
              );
              if (scContainer) {
                scContainer.classList.add("spellcasting-trait");
                const header = root.querySelector("header.character-header-modern");
                if (header && !header.getAttribute("data-spellcasting-trait"))
                  header.setAttribute("data-spellcasting-trait", traitKey);
                return true;
              }
            } catch (_) { }
            return false;
          };

          if (!ensureMarked()) {
            setTimeout(ensureMarked, 50);
            setTimeout(ensureMarked, 150);
            try {
              const header = root.querySelector("header.character-header-modern");
              if (header) {
                const mo = new MutationObserver(() => {
                  if (ensureMarked()) {
                    try { mo.disconnect(); } catch (_) { }
                  }
                });
                mo.observe(header, { childList: true, subtree: true });
              }
            } catch (_) { }
          }

          // Mount moving particle canvas overlay onto the spellcasting tile
          const mountSpellParticles = () => {
            try {
              if (!traitKey) return false;
              const particlesEnabled = game.settings.get(MODULE_ID, "enableParticles");
              if (!particlesEnabled) return false;

              const host = root.querySelector(
                ".attributes-row .attribute-container.spellcasting-trait .attribute-content"
              );
              if (!host) return false;
              if (!host.querySelector(".dhp-spell-particles")) {
                UIOverlayParticles.mount(host, {
                  minParticles: 22,
                  maxParticles: 55,
                  areaDivisor: 900,
                  repelRadius: 120,
                });
              }
              return true;
            } catch (_) {
              return false;
            }
          };
          if (!mountSpellParticles()) {
            setTimeout(mountSpellParticles, 50);
            setTimeout(mountSpellParticles, 150);
          }

          // Indicator click/keyboard to trigger the trait roll
          try {
            let indicator = root.querySelector(".spellcast-indicator");
            if (!indicator && traitKey) {
              // Create indicator if template didn't render it
              const portrait = root.querySelector(
                ".header-top-portrait"
              );
              if (portrait) {
                const el = document.createElement("div");
                el.className = "spellcast-indicator";
                el.setAttribute("role", "button");
                el.setAttribute("tabindex", "0");
                el.dataset.attribute = traitKey;
                el.innerHTML = '<i class="fa-solid fa-wand-sparkles"></i>';
                portrait.appendChild(el);
                indicator = el;
              }
            }
            if (indicator && traitKey) {
              try {
                const traitLabel = game.i18n?.localize?.(
                  `DAGGERHEART.CONFIG.Traits.${traitKey}.name`
                );
                if (!indicator.hasAttribute("data-tooltip") && traitLabel) {
                  const scLabel =
                    game.i18n?.localize?.("DAGGERHEART.GENERAL.spellcast") ??
                    "Spellcast";
                  indicator.setAttribute(
                    "data-tooltip",
                    `${scLabel}: ${traitLabel}`
                  );
                }
              } catch (_) { }

              const triggerCast = () => {
                try {
                  const attrEl = root.querySelector(
                    `.attributes-row .attribute-container[data-attribute="${traitKey}"]`
                  );
                  if (!attrEl) return;
                  const inner = attrEl.querySelector?.(".attribute-content") || attrEl;
                  if (typeof inner.click === "function") inner.click();
                  else {
                    const evt = new MouseEvent("click", {
                      bubbles: true,
                      cancelable: true,
                      view: window,
                    });
                    inner.dispatchEvent(evt);
                  }
                } catch (_) { }
              };

              indicator.addEventListener(
                "click",
                (ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  triggerCast();
                },
                { passive: false }
              );

              indicator.addEventListener("keydown", (ev) => {
                const k = ev.key?.toLowerCase?.();
                if (k === "enter" || k === " " || k === "spacebar") {
                  ev.preventDefault();
                  ev.stopPropagation();
                  triggerCast();
                }
              });
            }
          } catch (_) { }
        }
      } catch (_) { }

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
        } catch { }
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
        } catch { }
      }

      this._applySidebarLoadoutBackgrounds();

      this._attachLoadoutCardTooltips();

      try {
        window.daggerheartPlus?.bindThresholdClicks?.(
          this.element,
          this.document
        );
      } catch { }

      try {
        window.daggerheartPlus?.bindProgressBarClicks?.(
          this.element,
          this.document
        );
      } catch { }

      try {
        this._mountSpellParticles();
      } catch { }
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
          this._updateLoadoutResourceBadge(item, doc);
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
          } catch { }

          try {
            if (!item.hasAttribute("data-tooltip")) {
              const uuid =
                doc?.uuid ||
                (itemId && this.document?.uuid
                  ? `${this.document.uuid}.Item.${itemId}`
                  : null);
              if (uuid) item.setAttribute("data-tooltip", `#item#${uuid}`);
            }
          } catch { }
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
        } catch (e) { }
      } catch (_) { }
    }

    _updateAllLoadoutResourceBadges() {
      try {
        const root = this.element;
        if (!root) return;

        const selectors = [
          ".character-sidebar-sheet .loadout-section .inventory-item",
          ".dh-inline-rails.rails-left .loadout-section .inventory-item",
        ];

        for (const sel of selectors) {
          root.querySelectorAll(sel)?.forEach?.((item) => {
            this._updateLoadoutResourceBadge(item);
          });
        }
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed to refresh loadout resource badges",
          e
        );
      }
    }

    _updateLoadoutResourceBadge(element, doc) {
      try {
        if (!element || !element.classList?.contains?.("inventory-item"))
          return;

        const actor = this.document;
        const itemId = element.dataset.itemId;
        const itemDoc = doc || (itemId ? actor?.items?.get?.(itemId) : null);
        const resource = itemDoc?.system?.resource;
        if (!itemDoc || !resource || resource.type !== "simple") {
          const existing = element.querySelector(".loadout-resource-badge");
          if (existing) existing.remove();
          return;
        }

        const alwaysShow = game.settings.get(
          MODULE_ID,
          "alwaysShowLoadoutResourceCounters"
        );

        let badge = element.querySelector(".loadout-resource-badge");
        if (!badge) {
          badge = document.createElement("div");
          badge.className = "loadout-resource-badge";
          badge.setAttribute("role", "button");
          badge.setAttribute("tabindex", "-1");

          const iconEl = document.createElement("i");
          badge.appendChild(iconEl);

          const textWrap = document.createElement("span");
          textWrap.className = "badge-text";
          const valueEl = document.createElement("span");
          valueEl.className = "badge-value";
          textWrap.appendChild(valueEl);

          const sepEl = document.createElement("span");
          sepEl.className = "badge-separator";
          textWrap.appendChild(sepEl);

          const maxEl = document.createElement("span");
          maxEl.className = "badge-max";
          textWrap.appendChild(maxEl);

          badge.appendChild(textWrap);
          element.appendChild(badge);

          badge._iconEl = iconEl;
          badge._valueEl = valueEl;
          badge._maxEl = maxEl;
          badge._sepEl = sepEl;

          this._bindLoadoutResourceBadgeEvents(badge);
        }

        const safeNumber = (value) => {
          const num = Number(value);
          return Number.isFinite(num) ? num : 0;
        };

        const value = safeNumber(resource.value);
        const maxRaw = resource.max;
        let maxNumber =
          maxRaw === undefined || maxRaw === null || maxRaw === ""
            ? null
            : Number(maxRaw);
        if (Number.isNaN(maxNumber)) maxNumber = null;

        const icon = resource.icon || "fa-solid fa-hashtag";
        badge._iconEl.className = icon;

        const currentValue = Math.max(
          0,
          maxNumber !== null ? Math.min(maxNumber, value) : value
        );
        badge._valueEl.textContent = String(currentValue);

        if (maxNumber !== null) {
          badge._sepEl.textContent = "/";
          badge._sepEl.style.display = "";
          badge._maxEl.textContent = String(maxNumber);
          badge._maxEl.style.display = "";
        } else {
          badge._sepEl.textContent = "";
          badge._sepEl.style.display = "none";
          badge._maxEl.textContent = "";
          badge._maxEl.style.display = "none";
        }

        badge.dataset.itemId = itemDoc.id ?? "";
        badge.dataset.itemUuid = itemDoc.uuid ?? "";
        badge.dataset.max = maxNumber !== null ? String(maxNumber) : "";
        badge.dataset.value = String(currentValue);
        badge.classList.toggle("has-max", maxNumber !== null);
        badge.classList.toggle("is-always-visible", Boolean(alwaysShow));

        const labelParts = [];
        if (itemDoc.name) labelParts.push(itemDoc.name);
        if (typeof resource.label === "string" && resource.label.trim().length)
          labelParts.push(resource.label.trim());
        const descriptor =
          labelParts.length > 0 ? labelParts.join(" - ") : itemDoc.name || "";
        const displayValue =
          maxNumber !== null ? `${currentValue}/${maxNumber}` : `${currentValue}`;

        const labelText = descriptor
          ? `${descriptor}: ${displayValue}`
          : displayValue;
        badge.setAttribute("aria-label", labelText);
        badge.title = labelText;
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed to update loadout resource badge",
          e
        );
      }
    }

    _bindLoadoutResourceBadgeEvents(badge) {
      try {
        if (!badge || badge._dhpLoadoutBadgeBound) return;
        badge._dhpLoadoutBadgeBound = true;

        const stop = (ev) => {
          ev.stopPropagation();
        };

        badge.addEventListener(
          "mousedown",
          (ev) => {
            if (ev.button === 0) ev.preventDefault();
            stop(ev);
          },
          true
        );
        badge.addEventListener(
          "mouseup",
          (ev) => {
            stop(ev);
          },
          true
        );

        badge.addEventListener("click", (ev) => {
          if (ev.button !== 0) return;
          ev.preventDefault();
          ev.stopPropagation();
          this._adjustLoadoutResourceBadgeValue(badge, 1);
        });

        badge.addEventListener("contextmenu", (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          this._adjustLoadoutResourceBadgeValue(badge, -1);
        });
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed to bind loadout resource badge events",
          e
        );
      }
    }

    async _adjustLoadoutResourceBadgeValue(badge, delta) {
      try {
        if (!badge || !delta) return;
        const itemId = badge.dataset.itemId;
        if (!itemId) return;
        const item = this.document?.items?.get?.(itemId);
        if (!item) return;
        const resource = item.system?.resource;
        if (!resource || resource.type !== "simple") return;

        const current = Number(resource.value ?? 0) || 0;
        const maxRaw = resource.max;
        let maxNumber =
          maxRaw === undefined || maxRaw === null || maxRaw === ""
            ? null
            : Number(maxRaw);
        if (Number.isNaN(maxNumber)) maxNumber = null;

        let next = current + delta;
        if (maxNumber !== null) next = Math.min(maxNumber, next);
        next = Math.max(0, next);
        if (next === current) return;

        await item.update({ "system.resource.value": next }, { render: false });

        const itemElement = badge.closest?.(".inventory-item");

        if (itemElement) this._updateLoadoutResourceBadge(itemElement, item);



        try {

          const root = this.element;

          if (root && item?.id != null) {

            const escape = globalThis.CSS?.escape ?? ((val) => `${val}`);

            const selector = `.inventory-item[data-item-id="${escape(item.id)}"]`;

            root.querySelectorAll(selector)?.forEach?.((el) => {

              if (el !== itemElement) this._updateLoadoutResourceBadge(el, item);

              el

                .querySelectorAll?.("input.inventory-item-resource")

                ?.forEach?.((input) => {

                  input.value = String(next);

                });

            });

          }

        } catch (_) { }
      } catch (e) {
        console.warn(
          "Daggerheart Plus | Failed to adjust loadout resource value",
          e
        );
      }
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
          } catch (_) { }
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
          } catch (_) { }
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
                } catch { }
                this._loadoutCardsBootstrapObserver = null;
              }
            });
            this._loadoutCardsBootstrapObserver.observe(container, {
              childList: true,
              subtree: true,
            });
          } catch (_) { }
        }
      } catch (_) { }
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
              <button type="button" class="rail-btn" title="C"><i class="fa-solid fa-backpack"></i></button>
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
      } catch { }
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
      } catch { }
    }

    _mountSpellParticles() {
      try {
        const root = this.element;
        if (!root) return;

        const traitKey =
          this.document?.system?.class?.subclass?.system?.spellcastingTrait ||
          this.document?.system?.class?.value?.system?.spellcastingTrait ||
          this.document?.system?.class?.system?.spellcastingTrait ||
          this.document?.system?.spellcastingTrait ||
          this.document?.flags?.daggerheart?.spellcastingTrait ||
          this.document?.flags?.[MODULE_ID]?.spellcastingTrait;

        if (!traitKey) {
          console.log("Daggerheart Plus | No spellcasting trait found for character:", this.document?.name);
          return;
        }

        const particlesEnabled = game.settings.get(MODULE_ID, "enableParticles");
        if (!particlesEnabled) {
          console.log("Daggerheart Plus | Particles disabled for spellcasting trait");
          return;
        }

        const host = root.querySelector(
          ".attributes-row .attribute-container.spellcasting-trait .attribute-content"
        );
        if (!host) {
          console.log("Daggerheart Plus | No spellcasting trait host element found");
          return;
        }
        if (host.querySelector(".dhp-spell-particles")) {
          console.log("Daggerheart Plus | Spellcasting particles already mounted");
          return;
        }

        console.log("Daggerheart Plus | Mounting spellcasting particles for trait:", traitKey);
        UIOverlayParticles.mount(host, {
          minParticles: 22,
          maxParticles: 55,
          areaDivisor: 900,
          repelRadius: 120,
        });
      } catch (e) {
        console.warn("Daggerheart Plus | Failed to mount spellcasting particles:", e);
      }
    }

    _unmountSpellParticles() {
      try {
        const root = this.element;
        if (!root) return;

        root
          .querySelectorAll(
            ".attributes-row .attribute-container.spellcasting-trait .attribute-content"
          )
          .forEach((host) => {
            try {
              host._dhpParticlesFX?.stop?.();
            } catch (_) { }
            try {
              host._dhpParticlesMounted = false;
            } catch (_) { }
          });
      } catch (_) { }
    }

    async close(options = {}) {
      try {
        this._removeInlineRails();
      } catch { }
      // Cleanup spellcasting particle FX if present
      try {
        this._unmountSpellParticles();
      } catch (_) { }
      try {
        this._loadoutCardsObserver?.disconnect?.();
      } catch { }
      this._loadoutCardsObserver = null;
      try {
        this._loadoutCardsBootstrapObserver?.disconnect?.();
      } catch { }
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
              } catch (e) { }
            });
          }
        } catch (_) { }
      } catch (e) { }
    }

    _removeInlineRails() {
      try {
        this.__inlineRails?.right?.remove?.();
        this.__inlineRails?.left?.remove?.();
        this.__inlineRails = null;
      } catch { }
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
        } catch { }
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
        } catch { }
      }

      try {
        window.daggerheartPlus?.bindProgressBarClicks?.(
          this.element,
          this.document
        );
      } catch { }
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
      } catch { }
    }
  };

  const DaggerheartPlusEnvironmentSheet = class extends systemAPI.Environment {
    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      classes: [...(super.DEFAULT_OPTIONS.classes || []), "daggerheart-plus"],
      position: {
        ...(super.DEFAULT_OPTIONS?.position || {}),
        width: 520,
        height: 800,
      },
    };

    get title() {
      return `${this.document.name} [DH+]`;
    }
  };

  const partyCollapseStates = new Map();

  const DaggerheartPlusPartySheet = class extends systemAPI.Party {
    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      classes: [...(super.DEFAULT_OPTIONS.classes || []), "daggerheart-plus"],
      position: {
        ...(super.DEFAULT_OPTIONS?.position || {}),
        width: 560,
        height: 800,
      },
    };

    static PARTS = {
      ...super.PARTS,
      header: {
        id: "header",
        template: "modules/daggerheart-plus/templates/party/header.hbs",
      },
      partyMembers: {
        id: "partyMembers",
        template: "modules/daggerheart-plus/templates/party/party-members.hbs",
        scrollable: [""],
      },
      inventory: {
        id: "inventory",
        template: "modules/daggerheart-plus/templates/party/inventory.hbs",
        scrollable: [".tab.inventory .items-section"],
      },
      notes: {
        id: "notes",
        template: "modules/daggerheart-plus/templates/party/notes.hbs",
      },
    };

    get title() {
      return `${this.document.name} [DH+]`;
    }

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      return context;
    }

    async _preparePartContext(partId, context, options) {
      context = await super._preparePartContext(partId, context, options);
      return context;
    }

    _onRender(context, options) {
      super._onRender(context, options);
      const root = this.element;
      if (!root) return;
      const partyId = this.document.uuid;
      if (!partyCollapseStates.has(partyId)) {
        partyCollapseStates.set(partyId, {});
      }
      const states = partyCollapseStates.get(partyId);
      const cards = root.querySelectorAll('.resource-card[data-item-uuid]');
      cards.forEach(card => {
        const memberUuid = card.dataset.itemUuid;
        if (memberUuid && states[memberUuid] !== undefined) {
          card.classList.toggle('collapsed', states[memberUuid]);
        }
      });
      const updateToggleIcon = () => {
        const toggleAllBtn = root.querySelector('[data-action="toggleAllMembers"]');
        if (!toggleAllBtn) return;
        const icon = toggleAllBtn.querySelector('i');
        const allCollapsed = [...cards].every(card => card.classList.contains('collapsed'));
        if (icon) icon.className = allCollapsed ? 'fa-solid fa-angles-down' : 'fa-solid fa-angles-up';
      };
      updateToggleIcon();
      root.querySelectorAll('.collapse-toggle[data-action="toggleCollapse"]').forEach(btn => {
        btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const card = btn.closest('.resource-card');
          if (card) {
            card.classList.toggle('collapsed');
            const memberUuid = card.dataset.itemUuid;
            if (memberUuid) states[memberUuid] = card.classList.contains('collapsed');
            updateToggleIcon();
          }
        });
      });
      const toggleAllBtn = root.querySelector('[data-action="toggleAllMembers"]');
      if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', (ev) => {
          ev.preventDefault();
          const allCollapsed = [...cards].every(card => card.classList.contains('collapsed'));
          cards.forEach(card => {
            const collapsed = !allCollapsed;
            card.classList.toggle('collapsed', collapsed);
            const memberUuid = card.dataset.itemUuid;
            if (memberUuid) states[memberUuid] = collapsed;
          });
          updateToggleIcon();
        });
      }
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

  documentSheetConfig.registerSheet(
    Actor,
    SYSTEM_ID,
    DaggerheartPlusPartySheet,
    {
      types: ["party"],
      label: "DH+ Party Sheet",
      makeDefault: true,
    }
  );

  console.log("Daggerheart Plus | Enhanced sheets registered successfully");
}

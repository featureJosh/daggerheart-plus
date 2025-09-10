import { FloatingSheetNavigation } from "../applications/floating-sheet-navigation.js";
const MODULE_ID = "daggerheart-plus";

export function createDaggerheartPlusCharacterSheet() {
  const BaseCharacterSheet =
    game.system.api?.applications?.sheets?.actors?.Character ||
    foundry.applications.sheets.ActorSheetV2;

  return class DaggerheartPlusCharacterSheet extends BaseCharacterSheet {
    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      classes: [
        ...(super.DEFAULT_OPTIONS.classes || ["sheet", "actor"]),
        "daggerheart-plus",
      ],
      position: {
        ...(super.DEFAULT_OPTIONS?.position || {}),
        width: Number(
          game.settings?.get?.(MODULE_ID, "defaultSheetWidth") ?? 900
        ),
        height: Number(
          game.settings?.get?.(MODULE_ID, "defaultSheetHeight") ?? 800
        ),
      },
    };

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

    constructor(options = {}) {
      super(options);
      this.currentSection = "features";
      this.floatingNav = null;
    }

    get title() {
      return `${this.document.name} [DH+]`;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      await this._createFloatingNavigation();
      this._showSection(this.currentSection);

      // Bind threshold HP quick marks early so it's not blocked by waits
      try {
        window.daggerheartPlus?.bindThresholdClicks?.(this.element, this.document);
      } catch (_) {}

      // Bind right-side tabs if present
      const root = this.element;
      if (!root) return;
      const tabButtons = root.querySelectorAll(
        'nav.tabs[data-group="primary"] .item.control'
      );
      tabButtons.forEach((btn) => {
        btn.addEventListener("click", (ev) => {
          ev.preventDefault();
          const tab = btn.dataset.tab;
          if (!tab) return;
          this.tabGroups = this.tabGroups || { primary: "features" };
          this.tabGroups.primary = tab;
          this._switchToSection(tab);
          // Update active class on buttons
          tabButtons.forEach((b) =>
            b.classList.toggle("active", b.dataset.tab === tab)
          );
        });
      });

      // Wait for loadout items to appear, then wire and apply
      await this._waitForLoadoutItems();

      this._bindSidebarLoadoutCardClicks();
      this._applySidebarLoadoutBackgrounds();
      this._attachLoadoutCardTooltips();
      this._bindEquipmentHoverIntent();
      try {
        if (game.user?.isGM) this._debugSidebarLoadoutBackgrounds();
      } catch {}

      // Re-bind threshold HP quick marks (1/2/3 HP) to catch late DOM
      try {
        window.daggerheartPlus?.bindThresholdClicks?.(this.element, this.document);
      } catch (_) {
        // Fallback: delegate at the root element
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
    }

    async _createFloatingNavigation() {
      if (this.floatingNav) {
        await this.floatingNav.close();
      }

      this.floatingNav = new FloatingSheetNavigation(this);
      await this.floatingNav.render(true);
    }

    _switchToSection(sectionName) {
      if (this.currentSection === sectionName) return;

      this.currentSection = sectionName;
      this._showSection(sectionName);

      if (this.floatingNav) {
        this.floatingNav.setActiveSection(sectionName);
      }
    }

    _showSection(sectionName) {
      const allSections = [
        "features",
        "loadout",
        "inventory",
        "biography",
        "effects",
      ];
      const bodyElement = this.element.querySelector(".sheet-body");

      if (!bodyElement) return;

      allSections.forEach((section) => {
        const sectionElement =
          bodyElement.querySelector(`[data-tab="${section}"]`) ||
          bodyElement.querySelector(`.${section}-content`) ||
          bodyElement.querySelector(`#${section}`);

        if (sectionElement) {
          sectionElement.style.display =
            section === sectionName ? "block" : "none";
        }
      });

      const activeContent =
        bodyElement.querySelector(`[data-tab="${sectionName}"]`) ||
        bodyElement.querySelector(`.${sectionName}-content`) ||
        bodyElement.querySelector(`#${sectionName}`);

      if (activeContent) {
        activeContent.style.display = "block";
      }
    }

    async _waitForLoadoutItems() {
      return new Promise((resolve) => {
        const poll = () => {
          try {
            const countLoadout =
              this.element?.querySelectorAll?.(
                ".character-sidebar-sheet .loadout-section .inventory-item, .dh-inline-rails.rails-left .loadout-section .inventory-item"
              )?.length || 0;
            const countEquip =
              this.element?.querySelectorAll?.(
                ".character-sidebar-sheet .equipment-section .inventory-item"
              )?.length || 0;
            if (countLoadout + countEquip > 0) return resolve();
          } catch {}
          setTimeout(poll, 50);
        };
        poll();
      });
    }

    /**
     * Ensure clicking anywhere on a loadout card triggers the same action
     * as clicking its roll image/button. We try common selectors used by
     * the base system; if a roll trigger is not found, fall back to the
     * item image inside the card.
     */
    _bindSidebarLoadoutCardClicks() {
      const root = this.element;
      if (!root) return;
      const containers = [
        root.querySelector(".character-sidebar-sheet .loadout-section"),
        root.querySelector(".dh-inline-rails.rails-left .loadout-section"),
      ].filter(Boolean);
      if (!containers.length) return;

      // Remove previous delegation if re-rendering
      if (this._loadoutClickHandler) {
        for (const c of containers) {
          try {
            c.removeEventListener("click", this._loadoutClickHandler, true);
          } catch {}
        }
      }

      this._loadoutClickHandler = (ev) => {
        const itemCard = ev.target.closest(".inventory-item");
        if (!itemCard) return;
        if (!containers.some((c) => c.contains(itemCard))) return;

        // Ignore clicks on explicit controls or links inside the card
        const interactive = ev.target.closest(
          'a, button, input, select, textarea, [contenteditable="true"]'
        );
        if (interactive) return; // let native behavior occur

        // If the card advertises a data-action, let system handlers run
        if (itemCard.hasAttribute("data-action")) return;

        // Prefer a dedicated roll trigger if present
        const rollTrigger = itemCard.querySelector(
          '.img-portait, [data-action="useItem"], .roll-img, .item-roll, [data-action="roll"], .rollable'
        );
        const target = rollTrigger || itemCard.querySelector(".item-img");
        if (!target) return;

        // Synthesize a primary click sequence on the target element
        this._synthesizePrimaryClick(target);
      };

      // Capture phase improves reliability when base handlers stop propagation
      for (const c of containers) {
        c.addEventListener("click", this._loadoutClickHandler, true);
      }
    }

    _synthesizePrimaryClick(target) {
      const opts = { bubbles: true, cancelable: true, view: window, button: 0 };
      try {
        target.dispatchEvent(new PointerEvent("pointerdown", opts));
      } catch {}
      try {
        target.dispatchEvent(new MouseEvent("mousedown", opts));
      } catch {}
      try {
        target.dispatchEvent(new MouseEvent("mouseup", opts));
      } catch {}
      try {
        target.dispatchEvent(new MouseEvent("click", opts));
      } catch {}
    }

    _debugSidebarLoadoutBackgrounds() {
      try {
        const list =
          this.element?.querySelector(
            ".character-sidebar-sheet .loadout-section .items-sidebar-list"
          ) ||
          this.element?.querySelector(
            ".dh-inline-rails.rails-left .loadout-section .items-sidebar-list"
          );
        if (!list) return;
        const items = list.querySelectorAll(".inventory-item");
        console.log(`[DH+] Loadout items: ${items.length}`);
        items.forEach((el, i) => {
          const itemId = el.dataset.itemId;
          const doc = this.document?.items?.get?.(itemId);
          console.log(`[DH+] #${i}`, {
            itemId,
            name: doc?.name,
            img: doc?.img,
            styleBG: el.style.backgroundImage,
            cssVar: el.style.getPropertyValue("--sidebar-card-bg"),
          });
        });
      } catch {}
    }

    /**
     * Use the item image inside each loadout card as the card background.
     * We store it in a CSS variable set on the card element so CSS can
     * render it and keep hover effects independent of JS afterwards.
     */
    _applySidebarLoadoutBackgrounds() {
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
          this._loadoutObserver.observe(list, { childList: true, subtree: true })
        );
      } catch (e) {
        /* ignore */
      }
    }

    /**
     * Add a small hover-intent delay to Equipment sidebar cards so they
     * only expand after the cursor rests on them for ~350ms.
     * If an element is provided, bind just that item; otherwise bind all.
     */
    _bindEquipmentHoverIntent(element) {
      const root = this.element;
      if (!root) return;
      const list = root.querySelector(
        ".character-sidebar-sheet .equipment-section .items-sidebar-list"
      );
      if (!list) return;

      const bind = (item) => {
        if (!item || item._hoverIntentBound) return;
        item._hoverIntentBound = true;
        const enter = () => {
          try { clearTimeout(item._hoverTO); } catch {}
          item._hoverTO = setTimeout(() => {
            item.classList.add("is-hovered");
          }, 350);
        };
        const leave = () => {
          try { clearTimeout(item._hoverTO); } catch {}
          item.classList.remove("is-hovered");
        };
        item.addEventListener("mouseenter", enter);
        item.addEventListener("mouseleave", leave);
        item.addEventListener("pointerdown", leave);
      };

      if (element) bind(element);
      else list.querySelectorAll(".inventory-item").forEach(bind);

      // Observe for dynamically added items in equipment list only
      try {
        if (!this._equipHoverObserver) {
          this._equipHoverObserver = new MutationObserver((mutations) => {
            for (const m of mutations) {
              m.addedNodes.forEach((n) => {
                if (n.nodeType === Node.ELEMENT_NODE) {
                  if (n.matches?.(".inventory-item")) bind(n);
                  n.querySelectorAll?.(".inventory-item").forEach(bind);
                }
              });
            }
          });
          this._equipHoverObserver.observe(list, {
            childList: true,
            subtree: true,
          });
        }
      } catch {}
    }

    /**
     * Ensure card items in the Loadout tab (grid/card view) get rich tooltips.
     * Upstream domain-card-item.hbs lacks data-tooltip; add it here using each
     * card's data-item-uuid so the system DhTooltipManager renders the item tooltip.
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
            // Attach to the LI itself so overlay layers don't block hovers.
            if (!li.hasAttribute("data-tooltip")) li.setAttribute("data-tooltip", `#item#${uuid}`);
            // Also attach to the visible overlay container
            const label = li.querySelector(".card-label");
            if (label && !label.hasAttribute("data-tooltip")) label.setAttribute("data-tooltip", `#item#${uuid}`);
            const img = li.querySelector("img.card-img, .card-img img, img");
            if (img) {
              if (!img.getAttribute("data-action")) img.setAttribute("data-action", "useItem");
              if (!img.hasAttribute("data-tooltip")) img.setAttribute("data-tooltip", `#item#${uuid}`);
            }
            const nameEl = li.querySelector(".card-name");
            if (nameEl && !nameEl.hasAttribute("data-tooltip")) nameEl.setAttribute("data-tooltip", `#item#${uuid}`);
          } catch {}
        };

        const wireLists = () => {
          const lists = container.querySelectorAll(".card-list");
          if (!lists?.length) return false;
          // Initial pass
          lists.forEach((ul) => ul.querySelectorAll(".card-item").forEach(apply));
          // Observe dynamic changes
          try {
            if (this._loadoutCardsObserver) this._loadoutCardsObserver.disconnect();
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
              this._loadoutCardsObserver.observe(ul, { childList: true, subtree: true })
            );
          } catch {}
          return true;
        };

        // If lists exist now, wire them; otherwise observe until they appear
        if (!wireLists()) {
          try {
            if (this._loadoutCardsBootstrapObserver) this._loadoutCardsBootstrapObserver.disconnect();
            this._loadoutCardsBootstrapObserver = new MutationObserver(() => {
              if (wireLists()) {
                try { this._loadoutCardsBootstrapObserver.disconnect(); } catch {}
                this._loadoutCardsBootstrapObserver = null;
              }
            });
            this._loadoutCardsBootstrapObserver.observe(container, {
              childList: true,
              subtree: true,
            });
          } catch {}
        }
      } catch {}
    }

    async close(options = {}) {
      if (this.floatingNav) {
        await this.floatingNav.close();
        this.floatingNav = null;
      }
      if (this._loadoutObserver) {
        try {
          this._loadoutObserver.disconnect();
        } catch {}
        this._loadoutObserver = null;
      }
      if (this._equipHoverObserver) {
        try { this._equipHoverObserver.disconnect(); } catch {}
        this._equipHoverObserver = null;
      }
      if (this._loadoutCardsObserver) {
        try { this._loadoutCardsObserver.disconnect(); } catch {}
        this._loadoutCardsObserver = null;
      }

      return super.close(options);
    }
  };
}

export const DaggerheartPlusCharacterSheet =
  createDaggerheartPlusCharacterSheet();

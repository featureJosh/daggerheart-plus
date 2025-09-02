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
      try {
        if (game.user?.isGM) this._debugSidebarLoadoutBackgrounds();
      } catch {}
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
            const count =
              this.element?.querySelectorAll?.(
                ".character-sidebar-sheet .loadout-section .inventory-item"
              )?.length || 0;
            if (count > 0) return resolve();
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
      const container = root.querySelector(
        ".character-sidebar-sheet .loadout-section"
      );
      if (!container) return;

      // Remove previous delegation if re-rendering
      if (this._loadoutClickHandler)
        container.removeEventListener("click", this._loadoutClickHandler, true);

      this._loadoutClickHandler = (ev) => {
        const itemCard = ev.target.closest(".inventory-item");
        if (!itemCard || !container.contains(itemCard)) return;

        // Ignore clicks on explicit controls or links inside the card
        const interactive = ev.target.closest(
          'a, button, input, select, textarea, [contenteditable="true"]'
        );
        if (interactive) return; // let native behavior occur

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
      container.addEventListener("click", this._loadoutClickHandler, true);
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
        const list = this.element?.querySelector(
          ".character-sidebar-sheet .loadout-section .items-sidebar-list"
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
      const list = root.querySelector(
        ".character-sidebar-sheet .loadout-section .items-sidebar-list"
      );
      if (!list) return;

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

        item.dataset.bgApplied = "1";
      };

      list.querySelectorAll(".inventory-item").forEach(apply);

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
            list.querySelectorAll(".inventory-item").forEach(apply);
        });
        this._loadoutObserver.observe(list, { childList: true, subtree: true });
      } catch (e) {
        /* ignore */
      }
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

      return super.close(options);
    }
  };
}

export const DaggerheartPlusCharacterSheet =
  createDaggerheartPlusCharacterSheet();

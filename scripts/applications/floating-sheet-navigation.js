export class FloatingSheetNavigation extends foundry.applications.api
  .ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "floating-sheet-navigation-{id}",
    tag: "nav",
    window: {
      frame: false,
      positioned: false,
    },
    position: {
      width: "auto",
      height: "auto",
    },
    classes: ["floating-sheet-nav"],
  };

  static PARTS = {
    navigation: {
      template:
        "modules/daggerheart-plus/templates/applications/floating-sheet-navigation.hbs",
    },
  };

  constructor(sheet) {
    super();
    this.sheet = sheet;
    this.actor = sheet.actor;
    this.currentSection = "features";
    this.sections = [
      { key: "features", label: "Features", icon: "fa-solid fa-star" },
      { key: "loadout", label: "Loadout", icon: "fa-solid fa-shield-halved" },
      {
        key: "inventory",
        label: "Inventory",
        icon: "fa-solid fa-bag-shopping",
      },
      { key: "biography", label: "Biography", icon: "fa-solid fa-user" },
      { key: "effects", label: "Effects", icon: "fa-solid fa-sparkles" },
    ];
  }

  get title() {
    return `${this.actor.name} Navigation`;
  }

  async _prepareContext(options) {
    return {
      sections: this.sections,
      currentSection: this.currentSection,
      actor: this.actor,
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this._positionNavigation();
    this._attachEventListeners();
  }

  _positionNavigation() {
    if (!this.sheet.rendered) return;

    const sheetElement = this.sheet.element;
    if (!sheetElement) return;

    const sheetRect = sheetElement.getBoundingClientRect();
    const navElement = this.element;

    navElement.style.position = "fixed";
    navElement.style.right = `${window.innerWidth - sheetRect.right + 20}px`;
    navElement.style.top = `${sheetRect.top + sheetRect.height / 2}px`;
    navElement.style.transform = "translateY(-50%)";
    navElement.style.zIndex = "1000";
  }

  _attachEventListeners() {
    const navButtons = this.element.querySelectorAll(
      ".nav-button[data-section]"
    );

    navButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        const section = button.dataset.section;
        this._switchToSection(section);
      });
    });

    window.addEventListener("resize", () => this._positionNavigation());

    if (this.sheet.element) {
      const observer = new MutationObserver(() => this._positionNavigation());
      observer.observe(this.sheet.element, {
        attributes: true,
        attributeFilter: ["style"],
      });
      this._observer = observer;
    }
  }

  _switchToSection(sectionName) {
    if (this.currentSection === sectionName) return;

    this.currentSection = sectionName;

    if (this.sheet._switchToSection) {
      this.sheet._switchToSection(sectionName);
    }

    this._updateActiveButton();
  }

  _updateActiveButton() {
    const navButtons = this.element.querySelectorAll(
      ".nav-button[data-section]"
    );

    navButtons.forEach((button) => {
      const isActive = button.dataset.section === this.currentSection;
      button.classList.toggle("active", isActive);
    });
  }

  setActiveSection(sectionName) {
    this.currentSection = sectionName;
    this._updateActiveButton();
  }

  async close(options = {}) {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }

    window.removeEventListener("resize", () => this._positionNavigation());

    return super.close(options);
  }
}

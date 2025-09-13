export class FloatingSheetRail extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "floating-sheet-rail-{id}-{side}",
    tag: "nav",
    window: { frame: false, positioned: false },
    position: { width: "auto", height: "auto" },
    classes: ["floating-sheet-rail"],
  };

  static PARTS = {
    rail: {
      template:
        "modules/daggerheart-plus/templates/applications/floating-sheet-rail.hbs",
    },
  };

  constructor(sheet, { side = "right", items = [] } = {}) {
    super();
    this.sheet = sheet;
    this.actor = sheet?.actor ?? sheet?.document;
    this.side = side;

    this.items = items?.length
      ? items
      : side === "right"
      ? [
          { key: "placeholder-1", icon: "fa-solid fa-sparkles", label: "A" },
          {
            key: "placeholder-2",
            icon: "fa-solid fa-shield-halved",
            label: "B",
          },
          {
            key: "placeholder-3",
            icon: "fa-solid fa-bag-shopping",
            label: "C",
          },
          { key: "placeholder-4", icon: "fa-solid fa-user", label: "D" },
          { key: "placeholder-5", icon: "fa-solid fa-hourglass", label: "E" },
        ]
      : [
          { key: "domain", label: "Domain" },
          { key: "class", label: "Class" },
          { key: "subclass", label: "Subclass" },
          { key: "community", label: "Community" },
          { key: "ancestry", label: "Ancestry" },
        ];
    try {
      console.debug(
        `[DH+] FloatingSheetRail ctor (${this.side}) for`,
        this.actor?.name
      );
    } catch {}
  }

  get title() {
    return `${this.actor?.name ?? "Actor"} ${this.side} rail`;
  }

  async _prepareContext() {
    return {
      side: this.side,
      items: this.items,
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    try {
      console.debug(
        `[DH+] FloatingSheetRail rendered (${this.side})`,
        this.element
      );
    } catch {}
    this._position();
    this._bind();
  }

  _bind() {
    this._resizeHandler = () => {
      this._position();
      this._syncVisibility?.();
    };
    window.addEventListener("resize", this._resizeHandler);

    if (this.sheet?.element) {
      const observer = new MutationObserver(() => {
        this._position();
        this._syncVisibility?.();
      });
      try {
        observer.observe(this.sheet.element, {
          attributes: true,
          attributeFilter: ["style", "class"],
          subtree: false,
        });
      } catch {}
      this._observer = observer;
    }
  }

  _position() {
    const root = this.sheet?.element;
    const el = this.element;
    if (!root || !el) return;

    const rect = root.getBoundingClientRect();
    el.style.position = "fixed";
    el.style.zIndex = "1000";

    el.style.width = "auto";

    if (this.side === "right") {
      el.style.left = "";
      el.style.right = `${Math.max(0, window.innerWidth - rect.right + 20)}px`;
      el.style.top = `${rect.top + rect.height / 2}px`;
      el.style.transform = "translateY(-50%)";
    } else {
      el.style.right = "";

      const width = el.getBoundingClientRect().width || 0;
      const targetRight = rect.left - 20;
      const left = Math.max(0, targetRight - width);
      el.style.left = `${left}px`;
      el.style.top = `${rect.top + rect.height / 2}px`;
      el.style.transform = "translateY(-50%)";
    }

    this._syncVisibility?.();
  }

  _syncVisibility() {
    const root = this.sheet?.element;
    const el = this.element;
    if (!root || !el) return;
    const isHidden =
      root.classList?.contains?.("minimized") ||
      root.classList?.contains?.("minimizing");
    el.classList.toggle("is-hidden", Boolean(isHidden));
  }

  async close(options = {}) {
    try {
      if (this._observer) this._observer.disconnect();
    } catch {}
    this._observer = null;
    if (this._resizeHandler)
      window.removeEventListener("resize", this._resizeHandler);
    this._resizeHandler = null;
    return super.close(options);
  }
}

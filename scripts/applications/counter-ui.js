export class CounterUI {
  constructor() {
    this.element = null;
    this.lastKnownValue = 0;
  }

  async initialize() {
    console.log("DH+ Fear Tracker | Initializing...");

    this.lastKnownValue = this.fearValue;

    Hooks.on("updateSetting", (setting) => {
      if (
        setting.key === "ResourcesFear" &&
        setting.namespace === "daggerheart"
      ) {
        console.log("DH+ Fear Tracker | Setting updated, refreshing display");
        this.updateDisplay();
      }
    });

    Hooks.on("DhGMUpdate", (data) => {
      if (data.action === "UpdateFear") {
        console.log(
          "DH+ Fear Tracker | Fear updated via DhGMUpdate:",
          data.update
        );
        this.updateDisplay();
        this.triggerChangeAnimation(data.update > this.lastKnownValue);
      }
    });

    if (game.socket) {
      game.socket.on("system.daggerheart", (data) => {
        console.log(
          "DH+ Fear Tracker | Received Daggerheart system event:",
          data
        );
        if (data.action === "DhpFearUpdate" || data.action === "UpdateFear") {
          this.updateDisplay();
          if (data.value !== undefined) {
            this.triggerChangeAnimation(data.value > this.lastKnownValue);
          }
        } else if (data.action === "RequestFearUpdate" && game.user.isGM) {
          console.log(
            "DH+ Fear Tracker | Processing fear update request from user:",
            data.userId
          );
          this.updateFear(data.value);
        }
      });
    }
  }

  get fearValue() {
    try {
      return game.settings.get("daggerheart", "ResourcesFear") || 0;
    } catch (error) {
      console.warn("DH+ Fear Tracker | Error getting fear value:", error);
      return 0;
    }
  }

  get maxFear() {
    try {
      return game.settings.get("daggerheart", "Homebrew")?.maxFear || 12;
    } catch (error) {
      return 12;
    }
  }

  get canModify() {
    return game.user.isGM;
  }

  async render() {
    console.log("DH+ Fear Tracker | Rendering...");

    if (this.element) {
      console.log("DH+ Fear Tracker | Removing existing element");
      this.element.remove();
    }

    const hotbar =
      document.querySelector("#ui-bottom #hotbar") ||
      document.querySelector("#hotbar");
    console.log("DH+ Fear Tracker | Hotbar found:", !!hotbar);

    if (!hotbar) {
      console.log("DH+ Fear Tracker | Hotbar not found, retrying in 1s");
      setTimeout(() => this.render(), 1000);
      return;
    }

    let container = document.querySelector("#counters-wrapper");
    if (!container) {
      container = document.createElement("div");
      container.id = "counters-wrapper";
      container.className = "counters-wrapper";
      hotbar.parentNode.insertBefore(container, hotbar);
    }

    const currentFear = this.fearValue;

    this.element = document.createElement("div");
    this.element.id = "counter-ui";
    this.element.className = "faded-ui counter-ui fear-tracker fear-center";
    this.element.innerHTML = `
            <button type="button" class="counter-minus" title="Decrease" ${
              !this.canModify ? 'style="display:none"' : ""
            }>
                <i class="fas fa-minus"></i>
            </button>
            <div class="counter-display">
                <div class="counter-value">${currentFear}</div>
                <div class="counter-label">${game.i18n.localize('DAGGERHEART.GENERAL.fear')}</div>
            </div>
            <button type="button" class="counter-plus" title="Increase" ${
              !this.canModify ? 'style="display:none"' : ""
            }>
                <i class="fas fa-plus"></i>
            </button>
        `;

    container.appendChild(this.element);

    console.log(
      "DH+ Fear Tracker | Element created. Current fear value:",
      currentFear
    );
    console.log("DH+ Fear Tracker | Can modify:", this.canModify);

    this.lastKnownValue = currentFear;
    this.setupEventListeners();
  }

  setupEventListeners() {
    if (!this.canModify) return;

    const minusBtn = this.element.querySelector(".counter-minus");
    const plusBtn = this.element.querySelector(".counter-plus");
    const display = this.element.querySelector(".counter-display");

    minusBtn?.addEventListener("click", () => this.changeFear(-1));
    plusBtn?.addEventListener("click", () => this.changeFear(1));
    display?.addEventListener("click", () => this.changeFear(1));
    display?.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      this.changeFear(-1);
    });
  }

  async changeFear(amount) {
    console.log("DH+ Fear Tracker | changeFear called with amount:", amount);
    const currentValue = this.fearValue;
    const newValue = Math.max(0, Math.min(this.maxFear, currentValue + amount));

    console.log("DH+ Fear Tracker | Fear values:", {
      currentValue,
      newValue,
      maxFear: this.maxFear,
    });

    if (currentValue === newValue) return;

    try {
      await this.updateFear(newValue);
    } catch (error) {
      console.error("DH+ Fear Tracker | Error updating fear:", error);
    }
  }

  async updateFear(newValue) {
    console.log("DH+ Fear Tracker | updateFear called with value:", newValue);

    if (!game.user.isGM) {
      console.log(
        "DH+ Fear Tracker | Non-GM, requesting fear update via socket"
      );
      return await game.socket.emit("system.daggerheart", {
        action: "RequestFearUpdate",
        value: newValue,
        userId: game.user.id,
      });
    } else {
      console.log("DH+ Fear Tracker | GM, updating fear setting");
      const oldValue = this.fearValue;
      await game.settings.set("daggerheart", "ResourcesFear", newValue);

      Hooks.callAll("DhGMUpdate", {
        action: "UpdateFear",
        update: newValue,
        previous: oldValue,
      });

      if (game.socket) {
        game.socket.emit("system.daggerheart", {
          action: "DhpFearUpdate",
          value: newValue,
          previous: oldValue,
        });
      }

      return newValue;
    }
  }

  updateDisplay() {
    if (!this.element) {
      console.log("DH+ Fear Tracker | updateDisplay: No element found");
      return;
    }

    const valueElement = this.element.querySelector(".counter-value");
    const newValue = this.fearValue;
    const oldValue = this.lastKnownValue;

    console.log(
      "DH+ Fear Tracker | updateDisplay: Updating from",
      oldValue,
      "to",
      newValue
    );

    if (valueElement) {
      valueElement.textContent = newValue;

      if (newValue !== oldValue && oldValue !== 0) {
        this.triggerChangeAnimation(newValue > oldValue);
      }

      this.lastKnownValue = newValue;
      console.log("DH+ Fear Tracker | Display updated successfully");
    } else {
      console.warn("DH+ Fear Tracker | Value element not found, re-rendering");
      this.render();
    }
  }

  triggerChangeAnimation(isIncrease) {
    if (!this.element) return;

    const container = this.element;
    const valueElement = this.element.querySelector(".counter-value");

    container.classList.remove("fear-changed");
    valueElement.classList.remove("fear-value-flash");

    setTimeout(() => {
      container.classList.add("fear-changed");
      valueElement.classList.add("fear-value-flash");

      this.createParticleEffect(isIncrease);

      setTimeout(() => {
        container.classList.remove("fear-changed");
        valueElement.classList.remove("fear-value-flash");
      }, 800);
    }, 10);
  }

  createParticleEffect(isIncrease) {
    if (!this.element) return;

    const container = this.element;
    const rect = container.getBoundingClientRect();

    const icon = "fa-skull";

    for (let i = 0; i < 6; i++) {
      const particle = document.createElement("div");
      particle.innerHTML = `<i class="fas ${icon}"></i>`;
      particle.style.position = "fixed";

      const randomStartX = rect.left + Math.random() * rect.width;
      const randomStartY = rect.top + Math.random() * rect.height;
      particle.style.left = `${randomStartX}px`;
      particle.style.top = `${randomStartY}px`;

      particle.style.fontSize = 1.0 + Math.random() * 0.4 + "em";
      particle.style.color = `hsl(${200 + Math.random() * 60}, 70%, 60%)`;
      particle.style.pointerEvents = "none";
      particle.style.zIndex = "10001";
      particle.className = isIncrease ? "skull-particle" : "smoke-particle";

      const randomAngle = Math.random() * Math.PI * 2;
      const randomDistance = 70 + Math.random() * 80;
      const tx = Math.cos(randomAngle) * randomDistance;
      const ty = Math.sin(randomAngle) * randomDistance;

      particle.style.setProperty("--tx", `${tx}px`);
      particle.style.setProperty("--ty", `${ty}px`);

      document.body.appendChild(particle);

      setTimeout(
        () => {
          if (particle.parentNode) {
            particle.parentNode.removeChild(particle);
          }
        },
        isIncrease ? 2000 : 3000
      );
    }
  }

  dispose() {
    if (this.element) {
      this.element.remove();
      this.element = null;
    }

    if (game.socket) {
      game.socket.off("system.daggerheart");
    }
  }
}

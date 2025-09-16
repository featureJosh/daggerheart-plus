const DAGGERHEART_NAMESPACE = "daggerheart";
const FEAR_SETTING_KEY = "ResourcesFear";
const HOMEBREW_SETTING_KEY = "Homebrew";
const WAIT_MAX_ATTEMPTS = 50;
const WAIT_DELAY_MS = 100;
const SYNC_INTERVAL_MS = 2000;
const UPDATE_DEBOUNCE_MS = 100;
const LOG_PREFIX = "DH+ Fear Tracker |";

function clampFearValue(value, maxFear) {
  const max = Number.isFinite(Number(maxFear)) ? Number(maxFear) : 12;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(max, Math.round(numeric)));
}

function safeGetDaggerheartSetting(key) {
  try {
    return game.settings.get(DAGGERHEART_NAMESPACE, key);
  } catch (error) {
    console.debug(`${LOG_PREFIX} Unable to read setting ${key}`, error);
    return undefined;
  }
}

function hasFearSource() {
  try {
    if (ui?.resources && typeof ui.resources.currentFear !== "undefined") {
      return true;
    }
  } catch (error) {}

  try {
    const value = game.settings.get(DAGGERHEART_NAMESPACE, FEAR_SETTING_KEY);
    return typeof value !== "undefined";
  } catch (error) {
    return false;
  }
}

export class CounterUI {
  constructor() {
    this.element = null;
    this._hooks = [];
    this._socketHandler = null;
    this._updateTimeout = null;
    this._syncInterval = null;
    this._isInitialized = false;
    this._lastFearState = { value: null, max: null };
    this._lastCanModify = null;

    this._onMinusClick = () => this.changeFear(-1);
    this._onPlusClick = () => this.changeFear(1);
    this._onDisplayClick = () => this.changeFear(1);
    this._onDisplayContext = (event) => {
      event.preventDefault();
      this.changeFear(-1);
    };
  }

  get canModify() {
    return Boolean(game.user?.isGM);
  }

  async initialize() {
    if (this._isInitialized) return;

    await this._waitForDaggerheartSystem();
    this._bindDaggerheartHooks();

    this._lastFearState = this._getFearState();
    this._isInitialized = true;
  }

  async _waitForDaggerheartSystem() {
    let attempts = 0;
    while (attempts < WAIT_MAX_ATTEMPTS) {
      if (hasFearSource()) return;
      await new Promise((resolve) => setTimeout(resolve, WAIT_DELAY_MS));
      attempts += 1;
    }
    console.warn(
      `${LOG_PREFIX} Timed out waiting for Daggerheart fear settings to become available.`
    );
  }

  _bindDaggerheartHooks() {
    const settingHandler = (setting) => {
      if (setting?.namespace !== DAGGERHEART_NAMESPACE) return;
      if (setting.key === FEAR_SETTING_KEY) {
        this._handleExternalUpdate(setting.value);
      } else if (setting.key === HOMEBREW_SETTING_KEY) {
        this._handleExternalUpdate(null, { animate: false });
      }
    };

    const gmUpdateHandler = (payload = {}) => {
      if (payload.action === "UpdateFear") {
        this._handleExternalUpdate(payload.update);
      }
    };

    const renderTrackerHandler = () => this._handleExternalUpdate();

    const genericRenderHandler = (app) => {
      const ctorName = app?.constructor?.name;
      if (ctorName === "FearTracker") {
        this._handleExternalUpdate();
      }
    };

    const userUpdateHandler = (user) => {
      if (user?.id === game.user?.id) {
        this._handleExternalUpdate(null, { animate: false });
      }
    };

    this._registerHook("updateSetting", settingHandler);
    this._registerHook("DhGMUpdate", gmUpdateHandler);
    this._registerHook("renderFearTracker", renderTrackerHandler);
    this._registerHook("render", genericRenderHandler);
    this._registerHook("updateUser", userUpdateHandler);

    if (game.socket) {
      this._socketHandler = (data = {}) => {
        const action = String(data?.action ?? "");
        if (action === "DhpFearUpdate" || action === "UpdateFear") {
          const value = data?.value ?? data?.update ?? null;
          this._handleExternalUpdate(value);
        } else if (action === "RequestFearUpdate" && game.user?.isGM) {
          const requestedValue = Number(data?.value);
          if (Number.isFinite(requestedValue)) {
            this.updateFear(requestedValue);
          }
        }
      };
      game.socket.on("system.daggerheart", this._socketHandler);
    }

    if (!this._syncInterval) {
      this._syncInterval = window.setInterval(
        () => this._syncIfStale(),
        SYNC_INTERVAL_MS
      );
    }
  }

  _registerHook(hook, fn) {
    Hooks.on(hook, fn);
    this._hooks.push({ hook, fn });
  }

  _syncIfStale() {
    if (!this._isInitialized || !this.element) return;
    const currentState = this._getFearState();
    if (
      currentState.value !== this._lastFearState.value ||
      currentState.max !== this._lastFearState.max
    ) {
      this.updateDisplay({ state: currentState, animate: false });
    }
  }

  _handleExternalUpdate(targetValue = null, { animate = true } = {}) {
    if (this._updateTimeout) {
      clearTimeout(this._updateTimeout);
    }

    this._updateTimeout = window.setTimeout(() => {
      const nextState = this._getFearState();
      if (targetValue !== null && typeof targetValue !== "undefined") {
        nextState.value = clampFearValue(targetValue, nextState.max);
      }
      this.updateDisplay({ state: nextState, animate });
    }, UPDATE_DEBOUNCE_MS);
  }

  _getFearState() {
    const tracker = ui?.resources;
    let current = null;
    let max = null;

    if (tracker) {
      try {
        if (typeof tracker.currentFear !== "undefined") {
          current = Number(tracker.currentFear);
        }
      } catch (error) {}
      try {
        if (typeof tracker.maxFear !== "undefined") {
          max = Number(tracker.maxFear);
        }
      } catch (error) {}
    }

    if (!Number.isFinite(current)) {
      current = Number(safeGetDaggerheartSetting(FEAR_SETTING_KEY));
    }
    if (!Number.isFinite(max)) {
      const homebrew = safeGetDaggerheartSetting(HOMEBREW_SETTING_KEY);
      if (homebrew && Number.isFinite(Number(homebrew?.maxFear))) {
        max = Number(homebrew.maxFear);
      }
    }

    if (!Number.isFinite(current)) current = 0;
    if (!Number.isFinite(max)) max = 12;

    return {
      value: clampFearValue(current, max),
      max: Math.max(0, Math.round(max)),
    };
  }

  async render() {
    await this.initialize();

    if (this.element) {
      this._refreshModifyBindings(false);
      this.element.remove();
      this.element = null;
    }

    const hotbar =
      document.querySelector("#ui-bottom #hotbar") ||
      document.querySelector("#hotbar");
    if (!hotbar) {
      window.setTimeout(() => this.render(), 1000);
      return;
    }

    let container = document.querySelector("#counters-wrapper");
    if (!container) {
      container = document.createElement("div");
      container.id = "counters-wrapper";
      container.className = "counters-wrapper";
      hotbar.parentNode?.insertBefore(container, hotbar);
    }

    const state = this._getFearState();

    const wrapper = document.createElement("div");
    wrapper.id = "counter-ui";
    wrapper.className = "faded-ui counter-ui fear-tracker fear-center";
    wrapper.innerHTML = `
      <button type="button" class="counter-minus" title="Decrease">
        <i class="fas fa-minus"></i>
      </button>
      <div class="counter-display" role="button" tabindex="0">
        <div class="counter-value">${state.value}</div>
        <div class="counter-label">${game.i18n.localize(
          "DAGGERHEART.GENERAL.fear"
        )}</div>
      </div>
      <button type="button" class="counter-plus" title="Increase">
        <i class="fas fa-plus"></i>
      </button>
    `;

    container.appendChild(wrapper);
    this.element = wrapper;
    this._lastFearState = state;
    this._lastCanModify = null;

    this.updateDisplay({ state, animate: false });
  }

  async changeFear(delta) {
    if (!this.canModify) return;

    const currentState = this._getFearState();
    const nextValue = clampFearValue(currentState.value + delta, currentState.max);
    if (nextValue === currentState.value) return;

    await this.updateFear(nextValue);
  }

  async updateFear(targetValue) {
    const currentState = this._getFearState();
    const newValue = clampFearValue(targetValue, currentState.max);

    try {
      const tracker = ui?.resources;
      if (tracker && typeof tracker.updateFear === "function") {
        await tracker.updateFear(newValue);
      } else if (game.user?.isGM) {
        await game.settings.set(DAGGERHEART_NAMESPACE, FEAR_SETTING_KEY, newValue);
      } else if (game.socket) {
        game.socket.emit("system.daggerheart", {
          action: "RequestFearUpdate",
          value: newValue,
          userId: game.user?.id,
        });
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Error updating fear`, error);
    }

    await this._syncFromSource({ animate: true });
  }

  async _syncFromSource({ animate = false } = {}) {
    const state = this._getFearState();
    this.updateDisplay({ state, animate });
  }

  updateDisplay({ state, animate = true } = {}) {
    if (!this.element) return;

    const nextState = state ?? this._getFearState();
    const previousValue = this._lastFearState.value;

    const valueElement = this.element.querySelector(".counter-value");
    if (valueElement) {
      valueElement.textContent = String(nextState.value);
    }

    this._updateControlStates(nextState);

    const valueChanged =
      previousValue !== null && nextState.value !== previousValue;
    this._lastFearState = {
      value: nextState.value,
      max: nextState.max,
    };

    if (animate && valueChanged) {
      this.triggerChangeAnimation(nextState.value > previousValue);
    }

  }

  _updateControlStates(state) {
    if (!this.element) return;

    this._refreshModifyBindings(this.canModify);

    const minusBtn = this.element.querySelector(".counter-minus");
    const plusBtn = this.element.querySelector(".counter-plus");

    if (minusBtn) {
      const disabled = !this.canModify || state.value <= 0;
      minusBtn.disabled = disabled;
      minusBtn.style.opacity = disabled ? "0.5" : "1";
    }

    if (plusBtn) {
      const disabled = !this.canModify || state.value >= state.max;
      plusBtn.disabled = disabled;
      plusBtn.style.opacity = disabled ? "0.5" : "1";
    }
  }

  _refreshModifyBindings(enabled) {
    if (!this.element || this._lastCanModify === enabled) return;

    const minusBtn = this.element.querySelector(".counter-minus");
    const plusBtn = this.element.querySelector(".counter-plus");
    const display = this.element.querySelector(".counter-display");

    this._lastCanModify = enabled;

    if (!minusBtn || !plusBtn || !display) return;

    if (enabled) {
      minusBtn.style.display = "";
      plusBtn.style.display = "";
      minusBtn.addEventListener("click", this._onMinusClick);
      plusBtn.addEventListener("click", this._onPlusClick);
      display.addEventListener("click", this._onDisplayClick);
      display.addEventListener("contextmenu", this._onDisplayContext);
    } else {
      minusBtn.style.display = "none";
      plusBtn.style.display = "none";
      minusBtn.removeEventListener("click", this._onMinusClick);
      plusBtn.removeEventListener("click", this._onPlusClick);
      display.removeEventListener("click", this._onDisplayClick);
      display.removeEventListener("contextmenu", this._onDisplayContext);
    }
  }

  triggerChangeAnimation(isIncrease) {
    if (!this.element) return;

    const container = this.element;
    const valueElement = this.element.querySelector(".counter-value");
    if (!valueElement) return;

    container.classList.remove("fear-changed");
    valueElement.classList.remove("fear-value-flash");

    window.setTimeout(() => {
      container.classList.add("fear-changed");
      valueElement.classList.add("fear-value-flash");

      this.createParticleEffect(isIncrease);

      window.setTimeout(() => {
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

      window.setTimeout(() => {
        particle.remove();
      }, isIncrease ? 2000 : 3000);
    }
  }

  dispose() {
    this._refreshModifyBindings(false);

    if (this.element) {
      this.element.remove();
      this.element = null;
    }

    if (this._updateTimeout) {
      clearTimeout(this._updateTimeout);
      this._updateTimeout = null;
    }

    if (this._syncInterval) {
      clearInterval(this._syncInterval);
      this._syncInterval = null;
    }

    if (this._socketHandler && game.socket) {
      game.socket.off("system.daggerheart", this._socketHandler);
      this._socketHandler = null;
    }

    for (const { hook, fn } of this._hooks) {
      Hooks.off(hook, fn);
    }
    this._hooks = [];

    this._isInitialized = false;
    this._lastFearState = { value: null, max: null };
    this._lastCanModify = null;
  }
}



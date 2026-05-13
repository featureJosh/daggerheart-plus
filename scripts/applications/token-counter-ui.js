import { canModifyDocument, getActorArmorData, setActorArmorValue } from "../module/compat.js";

const MODULE_ID = "daggerheart-plus";
const LOCATION_SETTING_KEY = "fearTrackerPosition";
const LINKED_ACTOR_COUNTERS_SETTING_KEY = "alwaysShowLinkedActorCounters";
const DEFAULT_LOCATION = "bottom";
const REFRESH_SETTLE_DELAY_MS = 100;

function getClientSetting(key, fallback = false) {
  try {
    return Boolean(game.settings.get(MODULE_ID, key));
  } catch (error) {
    return fallback;
  }
}

function toFiniteNumber(value, fallback = 0) {
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  const fallbackNumeric = Number(fallback);
  return Number.isFinite(fallbackNumeric) ? fallbackNumeric : 0;
}

function getLinkedCharacterActor() {
  const character = game.user?.character;
  if (!character) return null;
  if (character.system) return character;

  const actorId = typeof character === "string" ? character : character.id;
  return actorId ? game.actors?.get?.(actorId) ?? null : null;
}

function getTrackerLocation() {
  try {
    const value = game.settings.get(MODULE_ID, LOCATION_SETTING_KEY);
    return typeof value === "string" && value === "top" ? "top" : DEFAULT_LOCATION;
  } catch (error) {
    return DEFAULT_LOCATION;
  }
}

function resolveWrapperPlacement(preferred = DEFAULT_LOCATION) {
  const attempts = preferred === "top" ? ["top", "bottom"] : ["bottom", "top"];

  for (const location of attempts) {
    if (location === "top") {
      const top = document.querySelector("#ui-top");
      if (!top) continue;
      const navigation = top.querySelector("#navigation");
      return {
        location: "top",
        place: (element) => {
          if (!element) return;
          if (navigation?.insertAdjacentElement) {
            navigation.insertAdjacentElement("afterend", element);
          } else if (navigation?.parentNode === top) {
            const next = navigation.nextSibling;
            if (next) top.insertBefore(element, next);
            else top.appendChild(element);
          } else {
            top.appendChild(element);
          }
        },
      };
    }

    const hotbar =
      document.querySelector("#ui-bottom #hotbar") ||
      document.querySelector("#hotbar");
    const parent = hotbar?.parentNode;
    if (!parent) continue;

    return {
      location: "bottom",
      place: (element) => {
        if (!element) return;
        parent.insertBefore(element, hotbar);
      },
    };
  }

  return null;
}

function applyWrapperLocationState(element, location) {
  if (!element) return;
  const resolved = location === "top" ? "top" : "bottom";
  element.dataset.location = resolved;
  element.classList.toggle("counters-wrapper--top", resolved === "top");
  element.classList.toggle("counters-wrapper--bottom", resolved !== "top");
}
export class TokenCounterUI {
  constructor() {
    this.element = null;
    this.selectedToken = null;
    this.selectedActor = null;
    this.hp = { current: 0, max: 0 };
    this.hope = { current: 0, max: 0 };
    this.stress = { current: 0, max: 0 };
    this.armorSlots = { current: 0, max: 0 };
    this.characterStress = { current: 0, max: 0 };
    this.actorType = null;
    this._refreshTimeout = null;
    this._settledRefreshTimeout = null;
    this._refreshGeneration = 0;
    this._resourceUpdateQueue = Promise.resolve();
  }

  async initialize() {
    this._hooks = this._hooks || {};

    this._hooks.controlToken = (token, controlled) => {
      if (controlled && token?.actor) {
        this.setSelectedToken(token);
      } else {
        setTimeout(() => this.refreshSource(), 0);
      }
    };
    Hooks.on("controlToken", this._hooks.controlToken);

    this._hooks.updateActor = (actor, changes) => {
      if (this._isSelectedActor(actor))
        this._scheduleSelectedSourceRefresh({ actor, settle: true });
    };
    Hooks.on("updateActor", this._hooks.updateActor);

    this._hooks.updateItem = (item, changes) => {
      try {
        if (item.type !== "armor") return;
        const parent = item?.parent ?? item?.actor;
        if (!this._isSelectedActor(parent)) return;
        this._scheduleSelectedSourceRefresh({ actor: parent, settle: true });
      } catch {}
    };
    Hooks.on("updateItem", this._hooks.updateItem);

    this._hooks.updateToken = (token, changes) => {
      if (this._isSelectedToken(token)) {
        const tokenObject = token?.object;
        if (tokenObject?.actor) this.selectedToken = tokenObject;
        this._scheduleSelectedSourceRefresh({
          actor: tokenObject?.actor ?? token?.actor,
          settle: true,
        });
      }
    };
    Hooks.on("updateToken", this._hooks.updateToken);

    this._hooks.updateUser = (user, changes) => {
      if (user?.id !== game.user?.id || !("character" in (changes ?? {})))
        return;
      setTimeout(() => this.refreshSource(), 50);
    };
    Hooks.on("updateUser", this._hooks.updateUser);

    this.refreshSource();
  }

  _isSelectedActor(actor) {
    if (!actor) return false;
    if (actor === this.selectedActor) return true;

    const selectedActorIds = [
      this.selectedActor?.id,
      this.selectedToken?.actor?.id,
      this.selectedToken?.document?.actor?.id,
    ].filter(Boolean);
    if (actor.id && selectedActorIds.includes(actor.id)) return true;

    const selectedActorUuids = [
      this.selectedActor?.uuid,
      this.selectedToken?.actor?.uuid,
      this.selectedToken?.document?.actor?.uuid,
    ].filter(Boolean);
    return Boolean(actor.uuid && selectedActorUuids.includes(actor.uuid));
  }

  _isSelectedToken(token) {
    if (!token || !this.selectedToken) return false;

    const selectedTokenId =
      this.selectedToken.id ?? this.selectedToken.document?.id;
    const tokenId = token.id ?? token.document?.id;
    if (selectedTokenId && tokenId && selectedTokenId === tokenId) return true;

    const selectedTokenUuid =
      this.selectedToken.document?.uuid ?? this.selectedToken.uuid;
    const tokenUuid = token.document?.uuid ?? token.uuid;
    return Boolean(selectedTokenUuid && tokenUuid && selectedTokenUuid === tokenUuid);
  }

  _resolveSelectedToken() {
    if (!this.selectedToken) return null;

    const selectedTokenId =
      this.selectedToken.id ?? this.selectedToken.document?.id;
    const controlled = canvas?.tokens?.controlled?.find?.((token) => {
      const tokenId = token?.id ?? token?.document?.id;
      return selectedTokenId && tokenId === selectedTokenId;
    });
    if (controlled?.actor) return controlled;

    const layerToken = selectedTokenId
      ? canvas?.tokens?.get?.(selectedTokenId)
      : null;
    if (layerToken?.actor) return layerToken;

    const tokenObject = this.selectedToken.object;
    if (tokenObject?.actor) return tokenObject;

    return this.selectedToken;
  }

  _getSelectedSourceActor() {
    const token = this._resolveSelectedToken();
    if (token?.actor) {
      this.selectedToken = token;
      return token.actor;
    }

    if (!this.selectedActor) return null;
    if (this.selectedActor.id) {
      return game.actors?.get?.(this.selectedActor.id) ?? this.selectedActor;
    }
    return this.selectedActor;
  }

  _scheduleSelectedSourceRefresh({
    actor = null,
    delay = 0,
    settle = false,
  } = {}) {
    const generation = ++this._refreshGeneration;

    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }
    if (this._settledRefreshTimeout) {
      clearTimeout(this._settledRefreshTimeout);
      this._settledRefreshTimeout = null;
    }

    const runRefresh = () => {
      this._refreshTimeout = null;
      if (generation !== this._refreshGeneration) return;

      this._refreshSelectedSource(actor);

      if (settle) {
        this._settledRefreshTimeout = setTimeout(() => {
          this._settledRefreshTimeout = null;
          if (generation !== this._refreshGeneration) return;
          this._refreshSelectedSource(actor);
        }, REFRESH_SETTLE_DELAY_MS);
      }
    };

    this._refreshTimeout = setTimeout(runRefresh, delay);
  }

  _refreshSelectedSource(actorOverride = null) {
    if (actorOverride && !this._isSelectedActor(actorOverride)) return false;

    const actor = actorOverride ?? this._getSelectedSourceActor();
    if (!actor) {
      this.hide();
      return false;
    }

    if (!this.updateFromActor(actor)) {
      this.hide();
      return false;
    }

    this.show();
    this.render();
    return true;
  }

  refreshSource() {
    const controlled =
      canvas?.tokens?.controlled?.filter?.((token) => token?.actor) ?? [];
    if (controlled.length > 0) {
      this.setSelectedToken(controlled[0]);
      return;
    }

    if (getClientSetting(LINKED_ACTOR_COUNTERS_SETTING_KEY, false)) {
      const actor = getLinkedCharacterActor();
      if (actor) {
        this.setSelectedActor(actor);
        return;
      }
    }

    this.hide();
  }

  refreshSelectedSource({ settle = true } = {}) {
    this._scheduleSelectedSourceRefresh({ settle });
  }

  setSelectedToken(token) {
    if (!token || !token.actor) {
      this.hide();
      return;
    }

    this.selectedToken = token;
    this.selectedActor = token.actor;
    if (!this.updateFromActor(token.actor)) {
      this.hide();
      return;
    }
    this.show();
    this.render();
  }

  setSelectedActor(actor) {
    if (!actor) {
      this.hide();
      return;
    }

    this.selectedToken = null;
    this.selectedActor = actor;
    if (!this.updateFromActor(actor)) {
      this.hide();
      return;
    }
    this.show();
    this.render();
  }

  updateFromToken(token) {
    if (!token || !token.actor) return false;

    this.selectedActor = token.actor;
    return this.updateFromActor(token.actor);
  }

  updateFromActor(actor) {
    if (!actor) return false;

    const system = actor.system;
    if (!system?.resources) return false;
    this.selectedActor = actor;
    this.actorType = actor.type;

    this.hp = {
      current: toFiniteNumber(system.resources.hitPoints?.value),
      max: toFiniteNumber(system.resources.hitPoints?.max),
    };

    if (this.actorType === "character") {
      this.hope = {
        current: toFiniteNumber(system.resources.hope?.value),
        max: toFiniteNumber(system.resources.hope?.max),
      };

      this.characterStress = {
        current: toFiniteNumber(system.resources.stress?.value),
        max: toFiniteNumber(system.resources.stress?.max),
      };

      const armor = getActorArmorData(actor);
      this.armorSlots = {
        current: armor.marks,
        max: armor.max,
        uuid: armor.uuid,
      };
    } else if (
      this.actorType === "adversary" ||
      this.actorType === "companion"
    ) {
      this.stress = {
        current: toFiniteNumber(system.resources.stress?.value),
        max: toFiniteNumber(system.resources.stress?.max),
      };
    }

    const rightContainer = document.querySelector("#token-counters-right");
    if (rightContainer) {
      this.createRightCounters(rightContainer);
    }

    return true;
  }

  async render() {
    if (!this.selectedActor || !this.element) return;

    const container = this.element;
    container.innerHTML = "";

    if (this.canModify()) {
      const hpCounter = this.createCounter(
        "hp",
        this.hp,
        game.i18n.localize("DAGGERHEART.GENERAL.HitPoints.short")
      );
      container.appendChild(hpCounter);

      if (this.actorType === "character") {
        const hopeCounter = this.createCounter(
          "hope",
          this.hope,
          game.i18n.localize("DAGGERHEART.GENERAL.hope")
        );
        container.appendChild(hopeCounter);
      }
    }

    const rightContainer = document.querySelector("#token-counters-right");
    if (rightContainer) {
      this.createRightCounters(rightContainer);
    }

    this.activateListeners();
  }

  createCounter(type, resource, label) {
    const counter = document.createElement("div");
    counter.id = `token-${type}-counter`;
    counter.className = "faded-ui counter-ui token-counter";
    counter.innerHTML = `
            <button class="counter-minus ${type}-minus" data-type="${type}">
                <i class="fas fa-minus"></i>
            </button>
            <div class="counter-display">
                <div class="counter-value ${type}-value">${resource.current}/${resource.max}</div>
                <div class="counter-label">${label}</div>
            </div>
            <button class="counter-plus ${type}-plus" data-type="${type}">
                <i class="fas fa-plus"></i>
            </button>
        `;
    return counter;
  }

  activateListeners() {
    if (!this.element) return;

    const rightContainer = document.querySelector("#token-counters-right");
    const containers = [this.element, rightContainer].filter(Boolean);

    containers.forEach((container) => {
      const buttons = container.querySelectorAll(
        ".counter-minus, .counter-plus"
      );
      buttons.forEach((button) => {
        button.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.handleButtonClick(e);
        });
      });

      const displays = container.querySelectorAll(".counter-display");
      displays.forEach((display) => {
        display.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const counter = display.closest(".token-counter");
          const type = counter.querySelector("[data-type]").dataset.type;
          this.modifyResource(type, 1);
        });

        display.addEventListener("contextmenu", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const counter = display.closest(".token-counter");
          const type = counter.querySelector("[data-type]").dataset.type;
          this.modifyResource(type, -1);
        });
      });
    });
  }

  handleButtonClick(event) {
    const button = event.currentTarget;
    const type = button.dataset.type;
    const isIncrease = button.classList.contains("counter-plus");
    const amount = isIncrease ? 1 : -1;

    this.modifyResource(type, amount);
  }

  _setCachedResourceValue(type, value, maxValue) {
    const current = toFiniteNumber(value);
    const max = toFiniteNumber(maxValue);

    if (type === "hp") {
      this.hp = { current, max };
    } else if (type === "hope") {
      this.hope = { current, max };
    } else if (type === "stress") {
      this.stress = { current, max };
    } else if (type === "character-stress") {
      this.characterStress = { current, max };
    } else if (type === "armor-slots") {
      this.armorSlots = { ...this.armorSlots, current, max };
    }
  }

  _getCachedResourceValue(type) {
    if (type === "hp") return toFiniteNumber(this.hp.current);
    if (type === "hope") return toFiniteNumber(this.hope.current);
    if (type === "stress") return toFiniteNumber(this.stress.current);
    if (type === "character-stress")
      return toFiniteNumber(this.characterStress.current);
    if (type === "armor-slots") return toFiniteNumber(this.armorSlots.current);
    return 0;
  }

  async modifyResource(type, amount) {
    if (!this.selectedActor || !this.canModify()) return;

    const actor = this._getSelectedSourceActor() ?? this.selectedActor;
    if (!actor) return;
    let updatePath = "";
    let currentValue = 0;
    let maxValue = 0;

    switch (type) {
      case "hp":
        updatePath = "system.resources.hitPoints.value";
        currentValue = toFiniteNumber(this.hp.current);
        maxValue = toFiniteNumber(this.hp.max);
        break;
      case "hope":
        updatePath = "system.resources.hope.value";
        currentValue = toFiniteNumber(this.hope.current);
        maxValue = toFiniteNumber(this.hope.max);
        break;
      case "stress":
        updatePath = "system.resources.stress.value";
        currentValue = toFiniteNumber(this.stress.current);
        maxValue = toFiniteNumber(this.stress.max);
        break;
      case "character-stress":
        updatePath = "system.resources.stress.value";
        currentValue = toFiniteNumber(this.characterStress.current);
        maxValue = toFiniteNumber(this.characterStress.max);
        break;
      case "armor-slots":
        const armor = getActorArmorData(actor);
        if (!armor.hasArmor) return;
        currentValue = toFiniteNumber(this.armorSlots.current, armor.marks);
        maxValue =
          toFiniteNumber(this.armorSlots.max) > 0
            ? toFiniteNumber(this.armorSlots.max)
            : toFiniteNumber(armor.max);
        break;
      default:
        return;
    }

    const newValue = Math.max(0, Math.min(currentValue + amount, maxValue));

    if (newValue !== currentValue) {
      this._setCachedResourceValue(type, newValue, maxValue);
      await this.render();

      const applyUpdate = async () => {
        if (type === "armor-slots") {
          await setActorArmorValue(actor, newValue, this.armorSlots.uuid);
        } else {
          await actor.update({ [updatePath]: newValue });
        }
      };

      this._resourceUpdateQueue = this._resourceUpdateQueue
        .catch(() => {})
        .then(applyUpdate);

      try {
        await this._resourceUpdateQueue;
      } catch (error) {
        console.error("Daggerheart Plus | Failed to modify token counter", error);
      } finally {
        if (this._getCachedResourceValue(type) === newValue)
          this._scheduleSelectedSourceRefresh({ settle: true });
      }
    }
  }

  show() {
    if (!this.element) this.createElement();
    this.ensureWrapperLocation();
    if (this.element) this.element.style.display = "";
    this.updateWrapperDisplay();
  }

  hide() {
    if (this.element) this.element.style.display = "none";

    try {
      const right = document.querySelector("#token-counters-right");
      if (right) right.innerHTML = "";
    } catch (_) {}
    this.selectedToken = null;
    this.selectedActor = null;
    this.updateWrapperDisplay();
  }

  createElement(retries = 0) {
    const placement = resolveWrapperPlacement(getTrackerLocation());
    if (!placement) {
      if (retries < 10) setTimeout(() => this.createElement(retries + 1), 500);
      return;
    }

    let wrapper = document.querySelector("#counters-wrapper");
    if (!wrapper) {
      wrapper = document.createElement("div");
      wrapper.id = "counters-wrapper";
      wrapper.className = "counters-wrapper";
    }

    placement.place(wrapper);
    applyWrapperLocationState(wrapper, placement.location);

    let leftContainer = document.querySelector("#token-counters-left");
    if (!leftContainer) {
      leftContainer = document.createElement("div");
      leftContainer.id = "token-counters-left";
      leftContainer.className = "token-counters-left";
      wrapper.insertBefore(leftContainer, wrapper.firstChild);
    }

    let rightContainer = document.querySelector("#token-counters-right");
    if (!rightContainer) {
      rightContainer = document.createElement("div");
      rightContainer.id = "token-counters-right";
      rightContainer.className = "token-counters-right";
      wrapper.appendChild(rightContainer);
    }

    this.element = document.createElement("div");
    this.element.id = "token-counters-container";
    this.element.className = "token-counters-container";
    this.element.style.display = "none";

    leftContainer.appendChild(this.element);
  }


  ensureWrapperLocation() {
    const placement = resolveWrapperPlacement(getTrackerLocation());
    if (!placement) return;
    const wrapper = document.querySelector("#counters-wrapper");
    if (!wrapper) return;
    placement.place(wrapper);
    applyWrapperLocationState(wrapper, placement.location);
  }

  createRightCounters(rightContainer) {
    if (!this.selectedActor || !this.canModify()) {
      rightContainer.innerHTML = "";
      return;
    }

    rightContainer.innerHTML = "";

    if (this.actorType === "character") {
      const characterStressCounter = this.createCounter(
        "character-stress",
        this.characterStress,
        game.i18n.localize("DAGGERHEART.GENERAL.stress")
      );
      rightContainer.appendChild(characterStressCounter);

      const armorCounter = this.createCounter(
        "armor-slots",
        this.armorSlots,
        game.i18n.localize("DAGGERHEART.GENERAL.armor")
      );
      rightContainer.appendChild(armorCounter);
    } else if (
      this.actorType === "adversary" ||
      this.actorType === "companion"
    ) {
      const stressCounter = this.createCounter(
        "stress",
        this.stress,
        game.i18n.localize("DAGGERHEART.GENERAL.stress")
      );
      rightContainer.appendChild(stressCounter);
    }
  }

  canModify() {
    if (!this.selectedActor) return false;

    return canModifyDocument(this.selectedActor);
  }

  hasActiveCounters() {
    return Boolean(this.element && this.selectedActor && this.canModify());
  }

  updateWrapperDisplay() {
    try {
      window.daggerheartPlus?.updateCountersWrapperDisplay?.();
    } catch (_) {}
  }

  dispose() {
    if (this._refreshTimeout) {
      clearTimeout(this._refreshTimeout);
      this._refreshTimeout = null;
    }
    if (this._settledRefreshTimeout) {
      clearTimeout(this._settledRefreshTimeout);
      this._settledRefreshTimeout = null;
    }

    try {
      if (this._hooks?.controlToken)
        Hooks.off("controlToken", this._hooks.controlToken);
      if (this._hooks?.updateActor)
        Hooks.off("updateActor", this._hooks.updateActor);
      if (this._hooks?.updateItem)
        Hooks.off("updateItem", this._hooks.updateItem);
      if (this._hooks?.updateToken)
        Hooks.off("updateToken", this._hooks.updateToken);
      if (this._hooks?.updateUser)
        Hooks.off("updateUser", this._hooks.updateUser);
    } catch (_) {}
    this._hooks = {};

    if (this.element) {
      this.element.remove();
      this.element = null;
    }
    this.selectedToken = null;
    this.selectedActor = null;

    try {
      const right = document.querySelector("#token-counters-right");
      if (right) right.innerHTML = "";
    } catch (_) {}
  }
}


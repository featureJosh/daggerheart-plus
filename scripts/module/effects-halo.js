import { MODULE_ID } from "./constants.js";

const HALO_SETTING_KEY = "enableEffectsHalo";
const HALO_ICON_SIZE_SETTING_KEY = "effectsHaloIconSize";
const HALO_SPACING_SETTING_KEY = "effectsHaloSpacing";
const FALLBACK_EFFECT_ICON = "icons/svg/hazard.svg";
const thetaToXY = new Map();
const sizeAndIndexToOffsets = new Map();
let tokenPrototype = null;
let originalRefreshEffects = null;
let originalDrawEffect = null;
let haloEnabled = false;
let patchApplied = false;
let haloIconBaseSize = 18;
const DEFAULT_ICON_SIZE = 14;
let haloSpacingScale = 0.85;

function getHaloIconSizeSetting() {
  try {
    const value = Number(game.settings.get(MODULE_ID, HALO_ICON_SIZE_SETTING_KEY));
    return Number.isFinite(value) ? value : haloIconBaseSize;
  } catch (error) {
    return haloIconBaseSize;
  }
}

function getHaloSpacingSetting() {
  try {
    const value = Number(game.settings.get(MODULE_ID, HALO_SPACING_SETTING_KEY));
    return Number.isFinite(value) ? value : haloSpacingScale;
  } catch (error) {
    return haloSpacingScale;
  }
}

function setHaloIconBaseSize(size) {
  const numeric = Number(size);
  if (Number.isFinite(numeric) && numeric > 0) {
    haloIconBaseSize = numeric;
  }
}

function setHaloSpacingScale(factor) {
  const numeric = Number(factor);
  if (Number.isFinite(numeric) && numeric > 0) {
    haloSpacingScale = numeric;
  }
}

function getTokenPrototype() {
  if (tokenPrototype) return tokenPrototype;
  try {
    const TokenClass = CONFIG?.Token?.objectClass ?? globalThis?.Token;
    tokenPrototype = TokenClass?.prototype ?? null;
  } catch (error) {
    console.error("Daggerheart Plus | Unable to resolve token prototype", error);
    tokenPrototype = globalThis?.Token?.prototype ?? null;
  }
  return tokenPrototype;
}

function getHaloSetting() {
  try {
    return Boolean(game.settings.get(MODULE_ID, HALO_SETTING_KEY));
  } catch (error) {
    return false;
  }
}

function setHaloEnabled(enabled) {
  haloEnabled = Boolean(enabled);
}

function shouldUseHalo(token) {
  if (!haloEnabled) return false;
  if (!canvas || !canvas.ready) return false;
  if (!token?.effects) return false;
  return true;
}

function polarToCartesian(theta) {
  if (!thetaToXY.has(theta)) {
    thetaToXY.set(theta, {
      x: Math.cos(theta),
      y: Math.sin(theta),
    });
  }
  return thetaToXY.get(theta);
}

function getTokenSizeCategory(token) {
  const width = Math.max(token?.document?.width ?? 1, token?.document?.height ?? 1);
  if (width <= 0.75) return "tiny";
  if (width <= 1.25) return "sm";
  if (width <= 2.25) return "med";
  if (width <= 3.5) return "lg";
  if (width <= 4.5) return "huge";
  return "grg";
}

function sizeToOffset(size = "med") {
  switch (size) {
    case "tiny":
      return 1.4;
    case "sm":
      return 1.0;
    case "med":
      return 1.2;
    case "lg":
    case "huge":
    case "grg":
      return 0.925;
    default:
      return 1.0;
  }
}

function sizeToRowMax(size = "med") {
  switch (size) {
    case "tiny":
      return 10;
    case "sm":
      return 14;
    case "med":
      return 16;
    case "lg":
      return 20;
    case "huge":
      return 24;
    case "grg":
      return 28;
    default:
      return 20;
  }
}

function sizeToRowOffset(size = "med") {
  switch (size) {
    case "tiny":
      return 0.6;
    case "sm":
    case "med":
      return 0.3;
    case "lg":
    case "huge":
    case "grg":
      return 0.1;
    default:
      return 1.0;
  }
}

function sizeToIconScale(size = "med") {
  switch (size) {
    case "tiny":
    case "sm":
    case "med":
      return 0.85;
    case "lg":
      return 1.1;
    case "huge":
    case "grg":
      return 1.3;
    default:
      return 1.0;
  }
}

function calculateOffsets(index, size) {
  const category = size ?? "med";
  const key = `${category}:${index}`;
  if (!sizeAndIndexToOffsets.has(key)) {
    const rowMax = Math.max(sizeToRowMax(category), 1);
    const row = Math.floor(index / rowMax);
    const ratio = index / rowMax;
    const gapOffset = (1 / rowMax) * (1 + (row % 2)) * Math.PI;
    const initialRotation = (0.5 + (1 / rowMax) * Math.PI) * Math.PI;
    const theta = ratio * 2 * Math.PI + initialRotation + gapOffset;
    const offset = sizeToOffset(category) + row * sizeToRowOffset(category);
    sizeAndIndexToOffsets.set(key, { offset, theta });
  }
  return sizeAndIndexToOffsets.get(key);
}

function updateIconSize(effectIcon, size) {
  if (!effectIcon) return;
  effectIcon.width = size;
  effectIcon.height = size;
}

function updateIconPosition(effectIcon, index, token, sizeCategory, offsetScale = 1) {
  if (!effectIcon || !token) return;
  const { offset, theta } = calculateOffsets(index, sizeCategory);
  const scaledOffset = offset * offsetScale;
  const baseGrid = token?.scene?.grid?.size ?? 100;
  const gridSize = baseGrid > 0 ? baseGrid : 100;
  const gridSizeX = token?.scene?.grid?.sizeX ?? gridSize;
  const gridSizeY = token?.scene?.grid?.sizeY ?? gridSize;
  const tokenTileFactor = Math.max(token?.document?.width ?? 1, token?.document?.height ?? 1);
  const sizeFactor = Math.max(tokenTileFactor, 1);
  const normalizedOffset = Math.max(1 + (scaledOffset - 1) / sizeFactor, 0.1);
  const { x, y } = polarToCartesian(theta);
  const hexNudgeX = gridSizeX > gridSizeY ? Math.abs(gridSizeX - gridSizeY) / 2 : 0;
  const hexNudgeY = gridSizeY > gridSizeX ? Math.abs(gridSizeY - gridSizeX) / 2 : 0;
  effectIcon.position.x = hexNudgeX + ((x * normalizedOffset + 1) / 2) * tokenTileFactor * gridSize;
  effectIcon.position.y = hexNudgeY + (((-y) * normalizedOffset + 1) / 2) * tokenTileFactor * gridSize;
}

function updateEffectScales(token) {
  if (!shouldUseHalo(token)) return;
  if (!token?.effects) return;
  try {
    if (token.effects.bg) token.effects.bg.visible = false;
    const sizeCategory = getTokenSizeCategory(token);
    const gridSize = token?.scene?.grid?.size ?? 100;
    const gridScale = (gridSize > 0 ? gridSize : 100) / 100;
    const iconScale = sizeToIconScale(sizeCategory);
    const iconSize = haloIconBaseSize * iconScale * gridScale;
    const sizeNormalized = Math.max((haloIconBaseSize / DEFAULT_ICON_SIZE) * iconScale, 0.5);
    const offsetScale = Math.max(sizeNormalized * haloSpacingScale, 0.25);

    let index = 0;
    for (const effectIcon of token.effects.children ?? []) {
      if (!effectIcon) continue;
      if (effectIcon === token.effects.bg) continue;
      if (effectIcon === token.effects.overlay) continue;
      effectIcon.anchor?.set?.(0.5);
      updateIconSize(effectIcon, iconSize);
      updateIconPosition(effectIcon, index, token, sizeCategory, offsetScale);
      index += 1;
    }
  } catch (error) {
    console.error("Daggerheart Plus | Failed to update token effect halo", error);
  }
}

function getEffectSpriteChildren(token) {
  const effects = token?.effects;
  if (!effects?.children?.length) return [];
  return effects.children.filter((child) => child && child !== effects.bg && child !== effects.overlay);
}

function isHaloSprite(sprite) {
  return Boolean(sprite?.__daggerheartHalo);
}

function getSpriteSource(sprite) {
  return (
    sprite?.__daggerheartSource ??
    sprite?.texture?.baseTexture?.resource?.url ??
    sprite?.texture?.baseTexture?.resource?.src ??
    sprite?.texture?.baseTexture?.resource?.imageUrl ??
    FALLBACK_EFFECT_ICON
  );
}

function removeHaloSprites(token) {
  const effects = token?.effects;
  if (!effects?.children?.length) return false;
  let removed = false;
  for (const child of [...effects.children]) {
    if (!child) continue;
    if (child === effects.bg) continue;
    if (child === effects.overlay) continue;
    if (!isHaloSprite(child)) continue;
    effects.removeChild(child);
    child.destroy?.();
    removed = true;
  }
  return removed;
}

async function convertEffectIconsToHalo(token) {
  const effectSprites = getEffectSpriteChildren(token).filter((sprite) => !isHaloSprite(sprite));
  if (!effectSprites.length) return false;

  const effectsContainer = token.effects;
  const conversions = effectSprites.map((sprite) => {
    const index = effectsContainer.getChildIndex(sprite);
    const alpha = typeof sprite.alpha === "number" ? sprite.alpha : 1;
    const tint = typeof sprite.tint === "number" ? sprite.tint : null;
    const src = getSpriteSource(sprite);
    effectsContainer.removeChild(sprite);
    sprite.destroy?.();
    return { index, alpha, tint, src };
  });

  const results = await Promise.all(
    conversions.map(async (conversion) => {
      try {
        const icon = await drawHaloEffect(conversion.src, conversion.tint);
        if (!icon) return null;
        icon.alpha = conversion.alpha;
        return { ...conversion, icon };
      } catch (error) {
        console.error("Daggerheart Plus | Failed to convert effect icon to halo", error);
        return null;
      }
    })
  );

  const additions = results.filter(Boolean).sort((a, b) => a.index - b.index);
  for (const { icon, index } of additions) {
    const clampedIndex = Math.min(index, effectsContainer.children.length);
    effectsContainer.addChildAt(icon, clampedIndex);
  }

  updateEffectScales(token);
  return additions.length > 0;
}

async function refreshTokenEffects(token, { forceRedraw = false } = {}) {
  if (!token) return;

  const refreshFn = typeof token._refreshEffects === "function" ? token._refreshEffects.bind(token) : null;
  const useHalo = shouldUseHalo(token);

  if (!useHalo) {
    const removed = removeHaloSprites(token);
    if (refreshFn) {
      const result = refreshFn();
      if (result instanceof Promise) {
        await result;
      }
    } else if (removed) {
      updateEffectScales(token);
    }
    if (token?.effects?.bg) {
      token.effects.bg.visible = true;
    }
    return;
  }

  if (refreshFn) {
    const result = refreshFn();
    if (result instanceof Promise) {
      await result;
    }
  }

  if (forceRedraw) {
    const converted = await convertEffectIconsToHalo(token);
    if (!converted) {
      updateEffectScales(token);
    }
    return;
  }

  updateEffectScales(token);
}

class EffectTextureSpritesheet {
  static SPRITE_SIZE = 96;
  static BASE_TEXTURE_SIZE = 2048;

  static get spriteSize() {
    return this.SPRITE_SIZE;
  }

  static get baseTextureSize() {
    return this.BASE_TEXTURE_SIZE;
  }

  static get maxMemberCount() {
    const perEdge = Math.max(Math.floor(this.BASE_TEXTURE_SIZE / this.SPRITE_SIZE), 1);
    return perEdge * perEdge;
  }

  #baseTextures = [];
  #textureCache = new Map();

  #createBaseRenderTexture() {
    return new PIXI.BaseRenderTexture({
      width: this.constructor.baseTextureSize,
      height: this.constructor.baseTextureSize,
    });
  }

  #acquireSlot() {
    const maxMembers = this.constructor.maxMemberCount;
    let slot = this.#baseTextures[this.#baseTextures.length - 1];
    if (!slot || slot.count >= maxMembers) {
      slot = { texture: this.#createBaseRenderTexture(), count: 0 };
      this.#baseTextures.push(slot);
    }
    const index = slot.count;
    slot.count += 1;
    return { baseRenderTexture: slot.texture, index };
  }

  addToCache(path, renderable) {
    const existingTexture = this.#textureCache.get(path);
    if (existingTexture) {
      return existingTexture;
    }
    const { baseRenderTexture, index } = this.#acquireSlot();
    const spriteSize = this.constructor.spriteSize;
    const maxCols = Math.max(Math.floor(this.constructor.baseTextureSize / spriteSize), 1);
    const col = index % maxCols;
    const row = Math.floor(index / maxCols);
    const frame = new PIXI.Rectangle(
      col * spriteSize,
      row * spriteSize,
      spriteSize,
      spriteSize
    );
    const renderTexture = new PIXI.RenderTexture(baseRenderTexture, frame);
    canvas.app.renderer.render(renderable, { renderTexture });
    this.#textureCache.set(path, renderTexture);
    return renderTexture;
  }

  loadTexture(path) {
    return this.#textureCache.get(path);
  }
}

const effectCache = new EffectTextureSpritesheet();

function createHaloBackground(iconSize, borderWidth) {
  const background = new PIXI.Graphics();
  const radius = iconSize / 2;
  background.lineStyle(borderWidth, 0x444444, 1, 0);
  background.beginFill(0x222222);
  background.drawCircle(radius, radius, radius);
  background.endFill();
  return background;
}

function createRoundedEffectIcon(effectIcon) {
  const textureSize = EffectTextureSpritesheet.spriteSize;
  const borderWidth = 3;
  const container = new PIXI.Container();
  container.width = textureSize;
  container.height = textureSize;

  container.addChild(createHaloBackground(textureSize, borderWidth));
  container.addChild(effectIcon);

  const effectSize = textureSize - 6 * borderWidth;
  const baseWidth = effectIcon.texture?.width ?? effectIcon.width ?? effectSize;
  const baseHeight = effectIcon.texture?.height ?? effectIcon.height ?? effectSize;
  const scale = effectSize / Math.max(baseWidth, baseHeight);
  effectIcon.scale.set(scale, scale);
  effectIcon.x = (textureSize - effectIcon.width) / 2;
  effectIcon.y = (textureSize - effectIcon.height) / 2;

  const maskRadius = textureSize / 2 - 3 * borderWidth;
  const mask = new PIXI.Graphics()
    .beginFill(0xffffff)
    .drawCircle(textureSize / 2, textureSize / 2, maskRadius)
    .endFill();
  effectIcon.mask = mask;
  container.addChild(mask);
  return container;
}

async function drawHaloEffect(src, tint) {
  const cacheKey = src || FALLBACK_EFFECT_ICON;
  let effectTexture = effectCache.loadTexture(cacheKey);
  if (!effectTexture) {
    try {
      const texture = await loadTexture(src ?? FALLBACK_EFFECT_ICON, {
        fallback: FALLBACK_EFFECT_ICON,
      });
      const rawIcon = new PIXI.Sprite(texture);
      const roundedIcon = createRoundedEffectIcon(rawIcon);
      effectTexture = effectCache.addToCache(cacheKey, roundedIcon);
    } catch (error) {
      console.error("Daggerheart Plus | Failed to load effect icon texture", error);
      return null;
    }
  }
  const icon = new PIXI.Sprite(effectTexture);
  if (typeof tint === "number" && tint !== 0xffffff) {
    icon.tint = tint;
  }
  icon.__daggerheartHalo = true;
  icon.__daggerheartSource = cacheKey;
  return icon;
}


async function refreshAllTokenEffects(forceRedraw = false) {
  if (!canvas?.ready) return;

  const tokens = canvas.tokens?.placeables ?? [];
  for (const token of tokens) {
    try {
      await refreshTokenEffects(token, { forceRedraw });
    } catch (error) {
      console.error("Daggerheart Plus | Failed to refresh token effects", error);
    }
  }
}

function patchTokenPrototype() {
  if (patchApplied) return;
  const proto = getTokenPrototype();
  if (!proto) {
    console.error("Daggerheart Plus | Unable to locate token prototype for effects halo");
    return;
  }

  const refreshWrapper = function (wrapped, ...args) {
    const result = wrapped.apply(this, args);
    if (shouldUseHalo(this)) {
      updateEffectScales(this);
    } else if (this?.effects?.bg) {
      this.effects.bg.visible = true;
    }
    return result;
  };

  const drawWrapper = async function (wrapped, src, tint, ...rest) {
    if (!shouldUseHalo(this)) {
      return wrapped.call(this, src, tint, ...rest);
    }
    if (!src) return null;
    try {
      const icon = await drawHaloEffect(src, tint);
      if (!icon) return null;
      return this.effects.addChild(icon);
    } catch (error) {
      console.error("Daggerheart Plus | Failed to draw halo effect", error);
      return wrapped.call(this, src, tint, ...rest);
    }
  };

  if (libWrapper?.register) {
    libWrapper.register(MODULE_ID, "Token.prototype._refreshEffects", refreshWrapper, "MIXED");
    libWrapper.register(MODULE_ID, "Token.prototype._drawEffect", drawWrapper, "MIXED");
  } else {
    originalRefreshEffects = proto._refreshEffects;
    originalDrawEffect = proto._drawEffect;

    if (typeof originalRefreshEffects === "function") {
      proto._refreshEffects = function patchedRefreshEffects(...args) {
        const result = originalRefreshEffects.apply(this, args);
        if (shouldUseHalo(this)) {
          updateEffectScales(this);
        } else if (this?.effects?.bg) {
          this.effects.bg.visible = true;
        }
        return result;
      };
    }

    if (typeof originalDrawEffect === "function") {
      proto._drawEffect = async function patchedDrawEffect(src, tint, ...rest) {
        if (!shouldUseHalo(this)) {
          return originalDrawEffect.call(this, src, tint, ...rest);
        }
        if (!src) return null;
        try {
          const icon = await drawHaloEffect(src, tint);
          if (!icon) return null;
          return this.effects.addChild(icon);
        } catch (error) {
          console.error("Daggerheart Plus | Failed to draw halo effect", error);
          return originalDrawEffect.call(this, src, tint, ...rest);
        }
      };
    }
  }

  patchApplied = true;
}

function handleTokenUpdate(_scene, tokenDocument, changes) {
  if (!patchApplied || !haloEnabled) return;
  if (!changes) return;
  const sizeChanged = "width" in changes || "height" in changes;
  if (!sizeChanged) return;
  const token = canvas?.tokens?.get?.(tokenDocument.id);
  if (token) {
    updateEffectScales(token);
  }
}

export function initializeEffectsHalo() {
  Hooks.once("init", () => {
    setHaloEnabled(getHaloSetting());
    setHaloIconBaseSize(getHaloIconSizeSetting());
    setHaloSpacingScale(getHaloSpacingSetting());
  });

  Hooks.once("ready", () => {
    setHaloEnabled(getHaloSetting());
    setHaloIconBaseSize(getHaloIconSizeSetting());
    setHaloSpacingScale(getHaloSpacingSetting());
    try {
      patchTokenPrototype();
      if (haloEnabled) {
        void refreshAllTokenEffects(true);
      }
    } catch (error) {
      console.error("Daggerheart Plus | Failed to initialise effects halo", error);
    }
  });

  Hooks.on("canvasReady", () => {
    if (!patchApplied || !haloEnabled) return;
    void refreshAllTokenEffects(true);
  });

  Hooks.on("renderToken", (token) => {
    if (!patchApplied || !haloEnabled) return;
    if (shouldUseHalo(token)) {
      setTimeout(() => updateEffectScales(token), 10);
    }
  });

  Hooks.on("refreshToken", (token) => {
    if (!patchApplied || !haloEnabled) return;
    if (shouldUseHalo(token)) {
      setTimeout(() => updateEffectScales(token), 10);
    }
  });

  Hooks.on("updateToken", handleTokenUpdate);

  Hooks.on("updateActor", (actor, changes) => {
    if (!patchApplied || !haloEnabled) return;
    if (!changes?.effects && !changes?.system?.effects) return;
    const tokens = canvas?.tokens?.placeables?.filter(t => t.actor?.id === actor.id) ?? [];
    for (const token of tokens) {
      if (shouldUseHalo(token)) {
        setTimeout(() => updateEffectScales(token), 50);
      }
    }
  });
}

export function applyEffectsHaloSetting(enabled) {
  setHaloEnabled(enabled);
  if (!patchApplied) return;
  void refreshAllTokenEffects(true);
}

export function refreshEffectsHalo() {
  if (!patchApplied) return;
  void refreshAllTokenEffects(true);
}

export function applyEffectsHaloSpacing(factor) {
  setHaloSpacingScale(factor);
  if (!patchApplied) return;
  void refreshAllTokenEffects(true);
}

export function applyEffectsHaloIconSize(size) {
  setHaloIconBaseSize(size);
  if (!patchApplied) return;
  void refreshAllTokenEffects(true);
}

export const __testing__ = {
  getTokenSizeCategory,
};


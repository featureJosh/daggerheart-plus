const MODULE_ID = "daggerheart-plus";

export class HoverDistance {
  static registerSettings() {
    try {
      game.settings.register(MODULE_ID, "enableHoverDistance", {
        name: "Enable Hover Distance",
        scope: "client",
        config: false,
        type: Boolean,
        default: true,
      });

      game.settings.register(MODULE_ID, "hoverDistancePosition", {
        name: "Tooltip Position",
        scope: "client",
        config: false,
        type: String,
        default: "center",
      });

      game.settings.register(MODULE_ID, "hoverDistanceRounding", {
        name: "Rounding",
        scope: "client",
        config: false,
        type: Number,
        default: 0,
      });

      game.settings.register(MODULE_ID, "hoverDistanceEdgeToEdge", {
        name: "Edge to Edge",
        scope: "client",
        config: false,
        type: Boolean,
        default: false,
      });

    } catch (e) {
      console.warn(
        "Daggerheart Plus | Failed to register HoverDistance settings",
        e
      );
    }
  }

  static initHooks() {
    Hooks.on("hoverToken", (token, hovered) => {
      try {
        if (!game.settings.get(MODULE_ID, "enableHoverDistance")) return;
        if (!canvas?.ready) return;
        if (!token) return;

        if (hovered) HoverDistance._showDistance(token);
        else HoverDistance._clearDistance(token);
      } catch (e) {
        console.warn(
          "Daggerheart Plus | HoverDistance hoverToken handler failed",
          e
        );
      }
    });

    Hooks.on("deleteToken", (doc) => {
      try {
        const t = canvas?.tokens?.get(doc.id);
        if (t) HoverDistance._clearDistance(t);
      } catch (_) {}
    });

    Hooks.on("controlToken", () => {
      try {
        const hoveredToken = canvas?.tokens?.placeables?.find((t) => t.hover);
        if (hoveredToken) {
          if (game.settings.get(MODULE_ID, "enableHoverDistance"))
            HoverDistance._showDistance(hoveredToken);
          else HoverDistance._clearDistance(hoveredToken);
        }
        if (HoverDistance._highlightModeActive)
          HoverDistance._showAllDistances();
      } catch (_) {}
    });

    HoverDistance._highlightModeActive = false;
    HoverDistance._onKeyDown = (ev) => {
      try {
        if (!game.settings.get(MODULE_ID, "enableHoverDistance")) return;
        if (ev.repeat) return;
        if (ev.key === "Alt" || ev.altKey) {
          if (!HoverDistance._highlightModeActive) {
            HoverDistance._highlightModeActive = true;
            HoverDistance._showAllDistances();
          }
        }
      } catch (_) {}
    };
    HoverDistance._onKeyUp = (ev) => {
      try {
        if (!HoverDistance._highlightModeActive) return;
        if (ev.key === "Alt" || (!ev.altKey && ev.key !== "Alt")) {
          HoverDistance._highlightModeActive = false;
          HoverDistance._clearAllDistances();
          const hoveredToken = canvas?.tokens?.placeables?.find((t) => t.hover);
          if (hoveredToken) HoverDistance._showDistance(hoveredToken);
        }
      } catch (_) {}
    };
    window.addEventListener("keydown", HoverDistance._onKeyDown);
    window.addEventListener("keyup", HoverDistance._onKeyUp);
  }

  static _getPrimaryControlledToken() {
    const controlled = canvas?.tokens?.controlled || [];
    if (controlled.length > 0) return controlled[0];
    return null;
  }

  static _showDistance(hoveredToken) {
    try {
      const source = HoverDistance._getPrimaryControlledToken();
      if (!source) return HoverDistance._clearDistance(hoveredToken);
      if (source === hoveredToken)
        return HoverDistance._clearDistance(hoveredToken);
      if (!hoveredToken?.visible || !source?.visible)
        return HoverDistance._clearDistance(hoveredToken);

      const dist = HoverDistance._measureDistance(source, hoveredToken);
      if (dist == null) return HoverDistance._clearDistance(hoveredToken);

      const text = HoverDistance._formatDistance(dist);
      HoverDistance._drawLabel(hoveredToken, text);
    } catch (e) {
      console.warn("Daggerheart Plus | Failed to show hover distance", e);
    }
  }

  static _clearDistance(token) {
    try {
      const label = token?.dhpHoverDistanceLabel;
      if (label) {
        label.parent?.removeChild(label);
        label.destroy({ children: true });
      }
      token.dhpHoverDistanceLabel = null;
    } catch (_) {}
  }

  static _showAllDistances() {
    try {
      const source = HoverDistance._getPrimaryControlledToken();
      if (!source) return HoverDistance._clearAllDistances();
      for (const t of canvas.tokens.placeables) {
        if (t === source) continue;
        if (!t?.visible) {
          HoverDistance._clearDistance(t);
          continue;
        }
        const dist = HoverDistance._measureDistance(source, t);
        if (dist == null) {
          HoverDistance._clearDistance(t);
          continue;
        }
        const text = HoverDistance._formatDistance(dist);
        HoverDistance._drawLabel(t, text);
      }
    } catch (e) {
      try {
        HoverDistance._clearAllDistances();
      } catch (_) {}
    }
  }

  static _clearAllDistances() {
    try {
      for (const t of canvas.tokens.placeables) HoverDistance._clearDistance(t);
    } catch (_) {}
  }

  static _measureDistance(source, target) {
    try {
      if (!canvas?.ready) return null;

      let horizontalDist;

      if (typeof source.distanceTo === "function") {
        horizontalDist = source.distanceTo(target);
        if (!isFinite(horizontalDist) || isNaN(horizontalDist)) return null;
      } else {
        horizontalDist = HoverDistance._measureFallback(source, target);
        if (horizontalDist == null) return null;
      }

      const z1 = Number(source?.document?.elevation ?? source?.elevation ?? 0);
      const z2 = Number(target?.document?.elevation ?? target?.elevation ?? 0);
      const dz = Math.abs(z2 - z1);

      return Math.hypot(horizontalDist, dz);
    } catch (e) {
      return null;
    }
  }

  static _measureFallback(a, b) {
    try {
      const dims = canvas?.dimensions;
      if (!dims) return null;
      const p1 = a.center;
      const p2 = b.center;

      const res = canvas?.grid?.measurePath([p1, p2], { gridSpaces: false });
      let horizontalUnits = NaN;

      if (res && typeof res.distance === "number" && isFinite(res.distance)) {
        horizontalUnits = res.distance;
      } else if (typeof res === "number" && isFinite(res)) {
        horizontalUnits = res;
      } else if (Array.isArray(res)) {
        let total = 0;
        for (const s of res) total += Number(s?.distance || 0);
        if (isFinite(total) && total > 0) horizontalUnits = total;
      }

      if (!isFinite(horizontalUnits)) {
        const dpp = (Number(dims.distance) || 5) / (Number(dims.size) || 100);
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        horizontalUnits = Math.hypot(dx, dy) * dpp;
      }

      if (!isFinite(horizontalUnits)) return null;

      const distPerGrid = Number(dims.distance) || 5;
      const w1 = Number(a?.document?.width ?? 1);
      const h1 = Number(a?.document?.height ?? 1);
      const r1 = (Math.max(1, w1, h1) / 2) * distPerGrid;
      const w2 = Number(b?.document?.width ?? 1);
      const h2 = Number(b?.document?.height ?? 1);
      const r2 = (Math.max(1, w2, h2) / 2) * distPerGrid;
      horizontalUnits = Math.max(0, horizontalUnits - r1 - r2);

      return horizontalUnits;
    } catch (_) {
      return null;
    }
  }

  static _formatDistance(rawValue) {
    const dh = HoverDistance._getDhRangeSettings();
    if (dh.enabled) {
      const label = HoverDistance._getRangeLabel(rawValue, dh);
      if (label) return label;
    }

    const value = Math.floor(rawValue);
    const units =
      canvas?.scene?.grid?.units ||
      game.i18n.localize("DHP.Settings.HoverDistance.Units.Default") ||
      "ft";
    return `${value} ${units}`;
  }

  static _drawLabel(token, text) {
    try {
      const base = Math.max(
        1,
        Math.min(token?.w || 0, token?.h || 0) ||
          (canvas?.dimensions?.size ?? 100)
      );
      const fontSize = Math.round(Math.max(12, Math.min(base * 0.22, 48)));
      const strokeThickness = Math.round(
        Math.max(2, Math.min(fontSize / 6, 8))
      );
      const shadowBlur = Math.max(2, Math.round(strokeThickness / 2));
      const shadowDist = Math.max(1, Math.round(strokeThickness / 2));

      const style = new PIXI.TextStyle({
        fill: 0xffffff,
        fontSize,
        fontWeight: "bold",
        stroke: 0x000000,
        strokeThickness,
        dropShadow: true,
        dropShadowColor: 0x000000,
        dropShadowBlur: shadowBlur,
        dropShadowDistance: shadowDist,
        align: "center",
      });

      HoverDistance._clearDistance(token);

      const label = new PIXI.Text(text, style);
      label.resolution = Math.max(
        2,
        Math.ceil(globalThis?.devicePixelRatio || 2)
      );

      const posPref =
        game.settings.get(MODULE_ID, "hoverDistancePosition") || "center";
      const w = token.w;
      const h = token.h;
      const offset = Math.round(Math.max(10, fontSize * 0.75));
      label.anchor.set(0.5, 0.5);
      switch (posPref) {
        case "top":
          label.position.set(w / 2, -offset);
          break;
        case "bottom":
          label.position.set(w / 2, h + offset);
          break;
        case "center":
        default:
          label.position.set(w / 2, h / 2);
          break;
      }

      token.addChild(label);
      token.dhpHoverDistanceLabel = label;
    } catch (e) {
      console.warn("Daggerheart Plus | Failed to draw hover distance label", e);
    }
  }

  static _getDhRangeSettings() {
    const dims = canvas?.dimensions;
    const distPerGrid = dims?.distance ?? 5;

    const defaults = {
      enabled: false,
      melee: 1 * distPerGrid,
      veryClose: 3 * distPerGrid,
      close: 10 * distPerGrid,
      far: 20 * distPerGrid,
    };

    try {
      if (game.system?.id !== "daggerheart") return defaults;

      let vr = null;
      try {
        vr = game.settings.get("daggerheart", "variantRules");
      } catch (_) {
        try {
          vr = game.settings.get("daggerheart", "VariantRules");
        } catch (_) {}
      }

      const range = vr?.rangeMeasurement || vr?.ranges || null;
      if (range) {
        return {
          enabled: !!range.enabled,
          melee: Number(range.melee ?? defaults.melee),
          veryClose: Number(range.veryClose ?? defaults.veryClose),
          close: Number(range.close ?? defaults.close),
          far: Number(range.far ?? defaults.far),
        };
      }
    } catch (_) {}

    return defaults;
  }

  static _getRangeLabel(distance, settings) {
    try {
      if (distance <= settings.melee)
        return game.i18n.localize("DAGGERHEART.CONFIG.Range.melee.name");
      if (distance <= settings.veryClose)
        return game.i18n.localize("DAGGERHEART.CONFIG.Range.veryClose.name");
      if (distance <= settings.close)
        return game.i18n.localize("DAGGERHEART.CONFIG.Range.close.name");
      if (distance <= settings.far)
        return game.i18n.localize("DAGGERHEART.CONFIG.Range.far.name");
      return game.i18n.localize("DAGGERHEART.CONFIG.Range.veryFar.name");
    } catch (_) {
      return null;
    }
  }

  static _i18n(key, fallback) {
    try {
      const i18n = game?.i18n;
      if (i18n?.has?.(key)) return i18n.localize(key);
      return fallback;
    } catch (_) {
      return fallback;
    }
  }
}

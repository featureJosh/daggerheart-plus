const MODULE_ID = "daggerheart-plus";

export class HoverDistance {
  static registerSettings() {
    try {
      game.settings.register(MODULE_ID, "enableHoverDistance", {
        name:
          game.i18n.localize("DHP.Settings.HoverDistance.Enable.Name") ||
          "Enable Hover Distance",
        hint:
          game.i18n.localize("DHP.Settings.HoverDistance.Enable.Hint") ||
          "Show distance between your selected token and any token you hover.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
      });

      game.settings.register(MODULE_ID, "hoverDistancePosition", {
        name:
          game.i18n.localize("DHP.Settings.HoverDistance.Position.Name") ||
          "Tooltip Position",
        hint:
          game.i18n.localize("DHP.Settings.HoverDistance.Position.Hint") ||
          "Where to show the distance label relative to the hovered token.",
        scope: "client",
        config: true,
        type: String,
        choices: {
          top: game.i18n.localize("DHP.Settings.Common.Top") || "Top",
          center: game.i18n.localize("DHP.Settings.Common.Center") || "Center",
          bottom: game.i18n.localize("DHP.Settings.Common.Bottom") || "Bottom",
        },
        default: "center",
      });

      game.settings.register(MODULE_ID, "hoverDistanceRounding", {
        name:
          game.i18n.localize("DHP.Settings.HoverDistance.Rounding.Name") ||
          "Rounding (units)",
        hint:
          game.i18n.localize("DHP.Settings.HoverDistance.Rounding.Hint") ||
          "Round the displayed distance to this step. 0 = floor to integer.",
        scope: "client",
        config: true,
        type: Number,
        default: 0,
        range: { min: 0, max: 25, step: 1 },
      });

      game.settings.register(MODULE_ID, "hoverDistanceEdgeToEdge", {
        name: HoverDistance._i18n(
          "DHP.Settings.HoverDistance.EdgeToEdge.Name",
          "Edge to Edge Measurement"
        ),
        hint: HoverDistance._i18n(
          "DHP.Settings.HoverDistance.EdgeToEdge.Hint",
          "Also subtract the target's half-size to measure edge-to-edge. Default measures Your Edge -> Target Center."
        ),
        scope: "client",
        config: false,
        type: Boolean,
        default: false,
      });

      // No additional measurement mode setting; default behavior is
      // Your Edge → Target Center, with optional Edge-to-Edge toggle above.
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

      const dist = HoverDistance._measureCenterDistance(source, hoveredToken);
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
        const dist = HoverDistance._measureCenterDistance(source, t);
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

  static _measureCenterDistance(a, b) {
    try {
      const dims = canvas?.dimensions;
      if (!dims) return null;
      const p1 = a.center;
      const p2 = b.center;

      let horizontalUnits = HoverDistance._measureCoreRulerUnits(p1, p2);
      if (!isFinite(horizontalUnits)) {
        const dpp = (Number(dims.distance) || 5) / (Number(dims.size) || 100);
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        horizontalUnits = Math.hypot(dx, dy) * dpp;
      }
      if (!isFinite(horizontalUnits)) return null;

      // Default behavior: Your Edge → Target Center (subtract source radius).
      const r1 = HoverDistance._tokenRadiusUnits(a);
      horizontalUnits = Math.max(0, horizontalUnits - r1);
      // Optional toggle: Edge to Edge (also subtract target radius).
      if (game.settings.get(MODULE_ID, "hoverDistanceEdgeToEdge")) {
        const r2 = HoverDistance._tokenRadiusUnits(b);
        horizontalUnits = Math.max(0, horizontalUnits - r2);
      }

      const z1 = Number(a?.document?.elevation ?? a?.elevation ?? 0);
      const z2 = Number(b?.document?.elevation ?? b?.elevation ?? 0);
      const dz = Math.abs(z2 - z1);

      return Math.hypot(horizontalUnits, dz);
    } catch (e) {
      return null;
    }
  }

  static _tokenRadiusUnits(token) {
    try {
      const dims = canvas?.dimensions;
      if (!dims) return 0;
      const distPerGrid = Number(dims.distance) || 5;
      const w = Number(token?.document?.width ?? 1);
      const h = Number(token?.document?.height ?? 1);
      const gridUnits = Math.max(1, isFinite(w) ? w : 1, isFinite(h) ? h : 1);
      return (gridUnits / 2) * distPerGrid;
    } catch (_) {
      return 0;
    }
  }

  // Measurement mode helper removed; behavior is fixed to
  // Your Edge → Target Center with optional Edge-to-Edge toggle.

  static _measureCoreRulerUnits(p1, p2) {
    try {
      const d = canvas?.grid?.measureDistance?.(p1, p2);
      if (typeof d === "number" && isFinite(d)) return d;
    } catch (_) {}
    try {
      const res = canvas?.grid?.measurePath?.([p1, p2], {
        gridSpaces: false,
        snapping: false,
      });

      if (res && typeof res.distance === "number" && isFinite(res.distance))
        return res.distance;

      if (typeof res === "number" && isFinite(res)) return res;

      if (Array.isArray(res)) {
        let total = 0;
        for (const s of res) total += Number(s?.distance || 0);
        if (isFinite(total) && total > 0) return total;
      }
    } catch (_) {}
    return NaN;
  }

  static _applyRounding(value) {
    const step = Number(
      game.settings.get(MODULE_ID, "hoverDistanceRounding") || 0
    );
    if (step <= 0) return Math.floor(value);
    const remainder = value % step;
    const rounded =
      remainder > step / 2 ? value + step - remainder : value - remainder;
    return Math.round(rounded * 1000000) / 1000000;
  }

  static _formatDistance(rawValue) {
    const dh = HoverDistance._getDhRangeSettings();
    if (dh.enabled) {
      const label = HoverDistance._getRangeLabel(rawValue, dh);
      if (label) return label;
    }

    const value = HoverDistance._applyRounding(rawValue);
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

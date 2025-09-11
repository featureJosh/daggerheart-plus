const MODULE_ID = "daggerheart-plus";

/**
 * Simple Hover Distance feature for Foundry VTT v13.
 * - Shows distance between the first controlled token and the hovered token
 * - Center-to-center measurement using scene distance-per-pixel
 * - Lightweight: no rulers, no complex sampling (can be extended later)
 */
export class HoverDistance {
  static registerSettings() {
    try {
      game.settings.register(MODULE_ID, "enableHoverDistance", {
        name: game.i18n.localize("DHP.Settings.HoverDistance.Enable.Name") || "Enable Hover Distance",
        hint: game.i18n.localize("DHP.Settings.HoverDistance.Enable.Hint") || "Show distance between your selected token and any token you hover.",
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
      });

      game.settings.register(MODULE_ID, "hoverDistancePosition", {
        name: game.i18n.localize("DHP.Settings.HoverDistance.Position.Name") || "Tooltip Position",
        hint: game.i18n.localize("DHP.Settings.HoverDistance.Position.Hint") || "Where to show the distance label relative to the hovered token.",
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
        name: game.i18n.localize("DHP.Settings.HoverDistance.Rounding.Name") || "Rounding (units)",
        hint: game.i18n.localize("DHP.Settings.HoverDistance.Rounding.Hint") || "Round the displayed distance to this step. 0 = floor to integer.",
        scope: "client",
        config: true,
        type: Number,
        default: 0,
        range: { min: 0, max: 25, step: 1 },
      });

      // World-level: distance measurement mode (affects all users)
      game.settings.register(MODULE_ID, "hoverDistanceMode", {
        name: game.i18n.localize("DHP.Settings.HoverDistance.Mode.Name") || "Measurement Mode",
        hint: game.i18n.localize("DHP.Settings.HoverDistance.Mode.Hint") || "Diagonal/grid style for horizontal; elevation added unless Exact 3D.",
        scope: "world",
        config: true,
        type: String,
        choices: {
          equidistant_1: game.i18n.localize("DHP.Settings.HoverDistance.Mode.equidistant_1") || "Equidistant (1)",
          exact_sqrt2: game.i18n.localize("DHP.Settings.HoverDistance.Mode.exact_sqrt2") || "Exact (√2)",
          approx_1_5: game.i18n.localize("DHP.Settings.HoverDistance.Mode.approx_1_5") || "Approximate (1.5)",
          rectilinear_2: game.i18n.localize("DHP.Settings.HoverDistance.Mode.rectilinear_2") || "Rectilinear (2)",
          alt_121: game.i18n.localize("DHP.Settings.HoverDistance.Mode.alt_121") || "Alternating (1/2/1)",
          alt_212: game.i18n.localize("DHP.Settings.HoverDistance.Mode.alt_212") || "Alternating (2/1/2)",
          illegal_inf: game.i18n.localize("DHP.Settings.HoverDistance.Mode.illegal_inf") || "Illegal (∞)",
          exact3d: game.i18n.localize("DHP.Settings.HoverDistance.Mode.exact3d") || "Exact 3D (√x²+y²+z²)",
        },
        default: "equidistant_1",
      });
    } catch (e) {
      console.warn("Daggerheart Plus | Failed to register HoverDistance settings", e);
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
        console.warn("Daggerheart Plus | HoverDistance hoverToken handler failed", e);
      }
    });

    // Clean up if tokens are deleted or control changes dramatically
    Hooks.on("deleteToken", (doc) => {
      const token = canvas?.tokens?.get(doc.id);
      if (token) HoverDistance._clearDistance(token);
    });

    Hooks.on("controlToken", (token, controlled) => {
      // When control changes, refresh distance if something is hovered
      try {
        const hoveredToken = canvas?.tokens?.placeables?.find((t) => t.hover);
        if (hoveredToken) {
          if (game.settings.get(MODULE_ID, "enableHoverDistance")) {
            HoverDistance._showDistance(hoveredToken);
          } else {
            HoverDistance._clearDistance(hoveredToken);
          }
        }
        // If highlight mode is active, refresh all
        if (HoverDistance._highlightModeActive) HoverDistance._showAllDistances();
      } catch (_) {}
    });

    // Highlight-mode (Alt key) support: show distance labels for all tokens
    HoverDistance._highlightModeActive = false;
    HoverDistance._onKeyDown = (ev) => {
      try {
        if (!game.settings.get(MODULE_ID, "enableHoverDistance")) return;
        if (ev.repeat) return;
        // Detect Alt highlight modifier
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
          // Restore single hover label if applicable
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
      if (source === hoveredToken) return HoverDistance._clearDistance(hoveredToken);
      if (!hoveredToken?.visible || !source?.visible) return HoverDistance._clearDistance(hoveredToken);

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
        if (!t?.visible) { HoverDistance._clearDistance(t); continue; }
        const dist = HoverDistance._measureCenterDistance(source, t);
        if (dist == null) { HoverDistance._clearDistance(t); continue; }
        const text = HoverDistance._formatDistance(dist);
        HoverDistance._drawLabel(t, text);
      }
    } catch (e) {
      // fail-safe: clear on unexpected errors
      try { HoverDistance._clearAllDistances(); } catch (_) {}
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
      const dpp = dims.distance / dims.size; // scene units per pixel

      const p1 = a.center; // {x, y}
      const p2 = b.center;
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const pixels = Math.hypot(dx, dy);
      const horizontalUnits = pixels * dpp;

      const elevA = HoverDistance._getElevationUnits(a) ?? 0;
      const elevB = HoverDistance._getElevationUnits(b) ?? 0;
      const verticalUnits = Math.abs(elevB - elevA);

      const mode = game.settings.get(MODULE_ID, "hoverDistanceMode") || "equidistant_1";
      const horizUnitsByMode = HoverDistance._measureHorizontalByMode(dx, dy, dpp, mode);
      let units;
      if (mode === "exact3d") {
        units = Math.hypot(horizUnitsByMode, verticalUnits); // true 3D
      } else if (mode === "illegal_inf" && horizUnitsByMode === Infinity) {
        units = Infinity;
      } else {
        units = horizUnitsByMode + verticalUnits; // add elevation to horizontal
      }

      if (!isFinite(units)) return null;
      return HoverDistance._applyRounding(units);
    } catch (e) {
      return null;
    }
  }

  static _getElevationUnits(token) {
    // Prefer token.document.elevation if available; fall back to token.elevation
    let elev = token?.document?.elevation;
    if (typeof elev !== "number") elev = token?.elevation;
    if (typeof elev !== "number") return 0;
    return elev;
  }

  static _measureCoreRulerUnits(p1, p2) {
    // Try Foundry's grid/ruler so results align with scene measurement rules
    try {
      // v10+ BaseGrid API often includes measureDistance
      const d = canvas?.grid?.measureDistance?.(p1, p2);
      if (typeof d === "number" && isFinite(d)) return d;
    } catch (_) {}
    try {
      // measurePath returns either a number or array of segments depending on version
      const res = canvas?.grid?.measurePath?.([p1, p2], { gridSpaces: false, snapping: false });
      if (typeof res === "number" && isFinite(res)) return res;
      if (Array.isArray(res)) {
        let total = 0;
        for (const s of res) total += Number(s.distance || 0);
        if (isFinite(total) && total > 0) return total;
      }
    } catch (_) {}
    return NaN; // ensure caller falls back
  }

  static _measureHorizontalByMode(dx, dy, dpp, mode) {
    const dims = canvas?.dimensions;
    const gridSize = dims?.size || 100; // px per grid space
    const perGrid = dims?.distance || 5; // units per grid space

    const sx = Math.abs(dx) / gridSize; // squares in x
    const sy = Math.abs(dy) / gridSize; // squares in y

    switch (mode) {
      case "exact3d":
      case "exact_sqrt2": {
        // Euclidean 2D for horizontal component
        const units = Math.hypot(dx, dy) * dpp;
        return units;
      }
      case "equidistant_1": {
        // Chebyshev: cost = max(sx, sy)
        const steps = Math.max(sx, sy);
        return steps * perGrid;
      }
      case "approx_1_5": {
        // Diagonals = min(sx, sy) at 1.5, orthogonals = |sx-sy| at 1
        const diag = Math.min(sx, sy);
        const ortho = Math.abs(sx - sy);
        const steps = diag * 1.5 + ortho * 1;
        return steps * perGrid;
      }
      case "rectilinear_2": {
        // Manhattan: cost = sx + sy
        const steps = sx + sy;
        return steps * perGrid;
      }
      case "alt_121":
      case "alt_212": {
        // 5/10/5 style: alternate diagonals 1 then 2 (or 2 then 1)
        const diagInt = Math.round(Math.min(sx, sy));
        const ortho = Math.abs(Math.round(sx) - Math.round(sy));
        let cost = 0;
        const startHeavy = mode === "alt_212"; // start with 2 if 212
        for (let i = 0; i < diagInt; i++) {
          const even = i % 2 === 0;
          const weight = (even && startHeavy) || (!even && !startHeavy) ? 2 : 1; // 212 vs 121
          cost += weight;
        }
        cost += ortho; // orthogonal steps cost 1
        return cost * perGrid;
      }
      case "illegal_inf": {
        // Diagonals are illegal
        if (sx > 0 && sy > 0) return Infinity;
        const steps = sx + sy; // one axis is zero
        return steps * perGrid;
      }
      default: {
        // Fallback to Euclidean 2D
        const units = Math.hypot(dx, dy) * dpp;
        return units;
      }
    }
  }

  static _applyRounding(value) {
    const step = Number(game.settings.get(MODULE_ID, "hoverDistanceRounding") || 0);
    if (step <= 0) return Math.floor(value);
    const remainder = value % step;
    const rounded = remainder > step / 2 ? value + step - remainder : value - remainder;
    return Math.round(rounded * 1000000) / 1000000;
  }

  static _formatDistance(value) {
    // Try to use Daggerheart narrative measurement if enabled
    const dh = HoverDistance._getDhRangeSettings();
    if (dh.enabled) {
      const label = HoverDistance._getRangeLabel(value, dh);
      if (label) return label;
    }

    // Numeric fallback
    const units = canvas?.scene?.grid?.units || game.i18n.localize("DHP.Settings.HoverDistance.Units.Default") || "ft";
    return `${value} ${units}`;
  }

  static _drawLabel(token, text) {
    try {
      const style = new PIXI.TextStyle({
        fill: 0xffffff,
        fontSize: 16,
        fontWeight: "bold",
        stroke: 0x000000,
        strokeThickness: 4,
        dropShadow: true,
        dropShadowColor: 0x000000,
        dropShadowBlur: 2,
        dropShadowDistance: 1,
        align: "center",
      });

      // Remove old label if any
      HoverDistance._clearDistance(token);

      const label = new PIXI.Text(text, style);
      label.resolution = 2;

      // Position relative to token
      const posPref = game.settings.get(MODULE_ID, "hoverDistancePosition") || "center";
      const w = token.w;
      const h = token.h;
      label.anchor.set(0.5, 0.5);
      switch (posPref) {
        case "top":
          label.position.set(w / 2, -12);
          break;
        case "bottom":
          label.position.set(w / 2, h + 12);
          break;
        case "center":
        default:
          label.position.set(w / 2, h / 2);
          break;
      }

      // Draw on token's mesh container so it moves with hover
      token.addChild(label);
      token.dhpHoverDistanceLabel = label;
    } catch (e) {
      console.warn("Daggerheart Plus | Failed to draw hover distance label", e);
    }
  }

  // --- Daggerheart narrative range integration ---
  static _getDhRangeSettings() {
    const dims = canvas?.dimensions;
    const distPerGrid = dims?.distance ?? 5; // default 5 ft per grid

    // Defaults based on docs: melee=1, veryClose=3, close=10, far=20 grid units
    const defaults = {
      enabled: false,
      melee: 1 * distPerGrid,
      veryClose: 3 * distPerGrid,
      close: 10 * distPerGrid,
      far: 20 * distPerGrid,
    };

    try {
      if (game.system?.id !== "daggerheart") return defaults;

      // Attempt to read Variant Rules settings from the Daggerheart system (DataModel settings in v12+)
      let vr = null;
      try {
        vr = game.settings.get("daggerheart", "variantRules");
      } catch (_) {
        // Some systems expose under a different key; try a couple of alternatives safely
        try { vr = game.settings.get("daggerheart", "VariantRules"); } catch (_) {}
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
    } catch (_) { /* ignore and use defaults */ }

    return defaults;
  }

  static _getRangeLabel(distance, settings) {
    try {
      if (distance <= settings.melee) return game.i18n.localize("DAGGERHEART.CONFIG.Range.melee.name");
      if (distance <= settings.veryClose) return game.i18n.localize("DAGGERHEART.CONFIG.Range.veryClose.name");
      if (distance <= settings.close) return game.i18n.localize("DAGGERHEART.CONFIG.Range.close.name");
      if (distance <= settings.far) return game.i18n.localize("DAGGERHEART.CONFIG.Range.far.name");
      return game.i18n.localize("DAGGERHEART.CONFIG.Range.veryFar.name");
    } catch (_) {
      return null;
    }
  }
}

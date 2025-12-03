import { MODULE_ID } from "./constants.js";

const TOOLTIP_WIDTH_SETTING_KEY = "tooltipCardMaxWidth";
const DEFAULT_TOOLTIP_WIDTH = 304;

function sanitizeTooltipWidth(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return DEFAULT_TOOLTIP_WIDTH;
  return Math.min(Math.max(Math.round(numeric), 160), 800);
}

export function getTooltipCardMaxWidth() {
  try {
    if (!game?.settings?.get) return DEFAULT_TOOLTIP_WIDTH;
    const stored = game.settings.get(MODULE_ID, TOOLTIP_WIDTH_SETTING_KEY);
    return sanitizeTooltipWidth(stored);
  } catch (e) {
    console.warn("Daggerheart Plus | Failed reading tooltip card max width", e);
    return DEFAULT_TOOLTIP_WIDTH;
  }
}

export function applyTooltipCardMaxWidth(widthOverride) {
  try {
    const root = document?.documentElement;
    if (!root) return;
    const value =
      widthOverride !== undefined
        ? sanitizeTooltipWidth(widthOverride)
        : getTooltipCardMaxWidth();
    root.style.setProperty("--dhp-tooltip-max-width", `${value}px`);
  } catch (e) {
    console.warn("Daggerheart Plus | Failed applying tooltip card max width", e);
  }
}
export function enhanceTooltipManager() {
  try {
    const BaseTooltipManager = CONFIG?.ux?.TooltipManager;
    if (BaseTooltipManager) {
      applyTooltipCardMaxWidth();

      class DHPTooltipCardManager extends BaseTooltipManager {
        async activate(element, options = {}) {
          const result = await super.activate(element, options);

          try {
            if (this.tooltip) {
              this.tooltip.classList.add("dhp-tooltip-card");
              this.tooltip.style.setProperty(
                "--dhp-tooltip-max-width",
                `${getTooltipCardMaxWidth()}px`
              );

              requestAnimationFrame(() => {
                this.rescaleTooltipIfNeeded(this.tooltip);
              });
            }
          } catch (e) {
            console.warn(
              "Daggerheart Plus | Error applying tooltip enhancements",
              e
            );
          }
          return result;
        }

        rescaleTooltipIfNeeded(tooltipElement) {
          if (!tooltipElement) return;

          const rect = tooltipElement.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const margin = 10;

          const overflowRight = Math.max(0, rect.right - (viewportWidth - margin));
          const overflowLeft = Math.max(0, margin - rect.left);
          const overflowBottom = Math.max(0, rect.bottom - (viewportHeight - margin));
          const overflowTop = Math.max(0, margin - rect.top);

          const horizontalOverflow = Math.max(overflowRight, overflowLeft);
          const verticalOverflow = Math.max(overflowBottom, overflowTop);

          if (horizontalOverflow > 0 || verticalOverflow > 0) {
            const scaleX = horizontalOverflow > 0 
              ? (rect.width - horizontalOverflow) / rect.width 
              : 1;
            const scaleY = verticalOverflow > 0 
              ? (rect.height - verticalOverflow) / rect.height 
              : 1;

            const scale = Math.min(scaleX, scaleY, 1);
            
            if (scale < 1) {
              tooltipElement.style.transformOrigin = 'top left';
              tooltipElement.style.transform = `scale(${scale})`;
            } else {
              tooltipElement.style.transform = '';
            }
          } else {
            tooltipElement.style.transform = '';
          }
        }
      }
      CONFIG.ux.TooltipManager = DHPTooltipCardManager;
    } else {
      console.warn(
        "Daggerheart Plus | No base tooltip manager found at init; skipping enhancement"
      );
    }
  } catch (e) {
    console.warn("Daggerheart Plus | Failed to enhance tooltips at init", e);
  }
}

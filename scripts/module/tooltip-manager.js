export function enhanceTooltipManager() {
  try {
    const BaseTooltipManager = CONFIG?.ux?.TooltipManager;
    if (BaseTooltipManager) {
      class DHPTooltipCardManager extends BaseTooltipManager {
        async activate(element, options = {}) {
          console.log(
            "DH+ Tooltip Manager: activate() called",
            element,
            options
          );
          const result = await super.activate(element, options);
          console.log(
            "DH+ Tooltip Manager: super.activate() completed",
            result
          );

          try {
            if (this.tooltip) {
              console.log(
                "DH+ Tooltip Manager: Found tooltip element",
                this.tooltip
              );
              console.log(
                "DH+ Tooltip Manager: Tooltip innerHTML preview:",
                this.tooltip.innerHTML.substring(0, 200)
              );

              this.tooltip.classList.add("dhp-tooltip-card");
              
              this.positionTooltipWithinViewport(element, this.tooltip);

              const images = this.tooltip.querySelectorAll(".tooltip-image");
              console.log(
                "DH+ Tooltip Manager: Found images in tooltip:",
                images.length,
                images
              );

              const tooltipEl = this.tooltip;

              const buildKey = () => {
                try {
                  const parts = [];
                  images.forEach((img) => {
                    parts.push(
                      img.getAttribute("src") ||
                        img.currentSrc ||
                        img.dataset?.src ||
                        ""
                    );
                  });
                  const title =
                    tooltipEl
                      .querySelector(".tooltip-title")
                      ?.textContent?.trim() || "";
                  parts.push(title);
                  return parts.join("|");
                } catch (_) {
                  return String(Date.now());
                }
              };

              const currentKey = buildKey();

              const prevCtrl = tooltipEl._dhpShineCtrl;
              if (prevCtrl && prevCtrl.key !== currentKey) {
                try {
                  if (prevCtrl.startTimer) clearTimeout(prevCtrl.startTimer);
                } catch {}
                try {
                  if (prevCtrl.cleanupTimer)
                    clearTimeout(prevCtrl.cleanupTimer);
                } catch {}
                try {
                  tooltipEl.classList.remove("tooltip-shine");
                } catch {}

                try {
                  prevCtrl.overlays?.forEach?.((el) => el.remove());
                } catch {}
                delete tooltipEl.dataset.dhpShineRunning;
                delete tooltipEl.dataset.dhpShineDone;
                tooltipEl._dhpShineCtrl = null;
              }

              let ctrl = tooltipEl._dhpShineCtrl;
              if (!ctrl || ctrl.key !== currentKey) {
                ctrl = {
                  key: currentKey,
                  overlays: [],
                  running: false,
                  done: false,
                };
                tooltipEl._dhpShineCtrl = ctrl;
              } else if (ctrl.running || ctrl.done) {
                return result;
              }

              ctrl.overlays = [];
              try {
                images.forEach((img) => {
                  const container =
                    img.closest?.(".tooltip-hero") || img.parentElement;
                  if (!container) return;
                  try {
                    const cs = getComputedStyle(container);
                    if (cs?.position === "static")
                      container.style.position = "relative";
                  } catch (_) {
                    if (!container.style.position)
                      container.style.position = "relative";
                  }
                  container
                    .querySelectorAll?.(".tooltip-image-shine")
                    ?.forEach((el) => el.remove());
                  const overlay = document.createElement("div");
                  overlay.className = "tooltip-image-shine";
                  container.appendChild(overlay);
                  ctrl.overlays.push(overlay);
                });
              } catch (e) {
                console.warn(
                  "DH+ Tooltip Manager: Failed to prepare shine overlays",
                  e
                );
              }

              if (!ctrl.overlays.length) return result;

              ctrl.startTimer = setTimeout(() => {
                if (!tooltipEl || tooltipEl._dhpShineCtrl !== ctrl) return;
                if (ctrl.done) return;
                ctrl.running = true;
                tooltipEl.dataset.dhpShineRunning = "1";
                tooltipEl.classList.add("tooltip-shine");

                let remaining = ctrl.overlays.length;
                const finalize = () => {
                  if (!tooltipEl || tooltipEl._dhpShineCtrl !== ctrl) return;
                  if (ctrl.done) return;
                  ctrl.done = true;
                  ctrl.running = false;
                  tooltipEl.classList.remove("tooltip-shine");

                  delete tooltipEl.dataset.dhpShineRunning;
                  tooltipEl.dataset.dhpShineDone = "1";
                  try {
                    ctrl.overlays.forEach((el) => el.remove());
                  } catch {}
                };

                ctrl.overlays.forEach((el) => {
                  const t = setTimeout(finalize, 1300);
                  el.addEventListener(
                    "animationend",
                    () => {
                      clearTimeout(t);
                      remaining -= 1;
                      if (remaining <= 0) finalize();
                    },
                    { once: true }
                  );
                });
              }, 150);
            } else {
              console.log("DH+ Tooltip Manager: No tooltip element found");
            }
          } catch (e) {
            console.error(
              "DH+ Tooltip Manager: Error applying classes",
              e
            );
          }
          return result;
        }

        positionTooltipWithinViewport(triggerElement, tooltipElement) {
          if (!triggerElement || !tooltipElement) return;

          setTimeout(() => {
            const triggerRect = triggerElement.getBoundingClientRect();
            const tooltipRect = tooltipElement.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const margin = 10;

            const tooltipWidth = tooltipRect.width || 380;
            const tooltipHeight = tooltipRect.height || 200;

            const triggerCenterX = triggerRect.left + triggerRect.width / 2;
            const triggerCenterY = triggerRect.top + triggerRect.height / 2;

            let newLeft = triggerCenterX - tooltipWidth / 2;
            let newTop = triggerRect.top - tooltipHeight - margin;

            if (newTop < margin) {
              newTop = triggerRect.bottom + margin;
            }

            if (newLeft < margin) {
              newLeft = margin;
            } else if (newLeft + tooltipWidth > viewportWidth - margin) {
              newLeft = viewportWidth - tooltipWidth - margin;
            }

            if (newTop + tooltipHeight > viewportHeight - margin) {
              newTop = viewportHeight - tooltipHeight - margin;
            }

            if (newTop < margin) {
              newTop = margin;
            }

            tooltipElement.style.position = 'fixed';
            tooltipElement.style.top = `${newTop}px`;
            tooltipElement.style.left = `${newLeft}px`;
            tooltipElement.style.right = 'auto';
            tooltipElement.style.bottom = 'auto';
            tooltipElement.style.transform = 'none';
            tooltipElement.classList.add('positioned');
          }, 0);
        }
      }
      CONFIG.ux.TooltipManager = DHPTooltipCardManager;
      console.log("Daggerheart Plus | Tooltip enhancement applied (init)");
      console.log(
        "DH+ Tooltip Manager: Registered manager",
        CONFIG.ux.TooltipManager
      );

      setTimeout(() => {
        console.log(
          "DH+ Tooltip Manager: Current manager after timeout",
          CONFIG.ux.TooltipManager
        );
        console.log(
          "DH+ Tooltip Manager: Manager is our class?",
          CONFIG.ux.TooltipManager === DHPTooltipCardManager
        );
      }, 5000);
    } else {
      console.warn(
        "Daggerheart Plus | No base tooltip manager found at init; skipping enhancement"
      );
    }
  } catch (e) {
    console.warn("Daggerheart Plus | Failed to enhance tooltips at init", e);
  }
}

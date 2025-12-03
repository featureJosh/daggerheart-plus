export class EnhancedDiceStyling {
  static initialize() {
    Hooks.on(
      "renderChatMessageHTML",
      EnhancedDiceStyling._onRenderChatMessageHTML
    );
    Hooks.on("renderApplication", EnhancedDiceStyling._onRenderApplication);
    Hooks.on("renderApplicationV2", EnhancedDiceStyling._onRenderApplication);
  }

  static _onRenderChatMessageHTML(...args) {
    const [message, element] = args.length === 2 ? args : [args[2], args[1]];
    const root = element;
    return EnhancedDiceStyling._onRenderChatMessage(message, root, {});
  }

  static _onRenderChatMessage(message, root, data) {
    if (
      !message.flags?.daggerheart &&
      !message.flags?.["daggerheart-unofficial"]
    )
      return;

    EnhancedDiceStyling._styleDiceTooltips(root);
    EnhancedDiceStyling._styleChatMessageBackground(root, message);
    EnhancedDiceStyling._addClickableRerollHandlers(root, message);
    EnhancedDiceStyling._setupExpandableRolls(root);
  }

  static _onRenderApplication(app, element, data) {
    if (element?.classList?.contains("roll-selection")) {
      EnhancedDiceStyling._setupRollSelectionHandlers(element);
    }
  }

  static _styleDiceTooltips(root) {
    const tooltipParts = root.querySelectorAll(
      ".dice-tooltip .wrapper .roll-dice .roll-die"
    );

    tooltipParts.forEach((part) => {
      const label = part.querySelector(".die-label");
      const diceElement = part.querySelector(".dice");

      if (diceElement) {
        const t = diceElement.getAttribute("data-type");
        if (t === "hope") {
          diceElement.classList.add("hope-die");
          diceElement.setAttribute(
            "data-flavor",
            game.i18n.localize("DAGGERHEART.GENERAL.hope")
          );
          label?.classList.add("hope-flavor");
          part.classList.add("hope-die-container");
        } else if (t === "fear") {
          diceElement.classList.add("fear-die");
          diceElement.setAttribute(
            "data-flavor",
            game.i18n.localize("DAGGERHEART.GENERAL.fear")
          );
          label?.classList.add("fear-flavor");
          part.classList.add("fear-die-container");
        }
      }
    });

    const rollFlavorLines = root.querySelectorAll(
      ".roll-result-desc, .roll-title"
    );
    rollFlavorLines.forEach((line) => {
      const text = (line.textContent || "").toLowerCase();

      if (text.includes("hope")) {
        line.classList.add("hope-result");
      } else if (text.includes("fear")) {
        line.classList.add("fear-result");
      } else if (text.includes("critical")) {
        line.classList.add("critical-result");
      }
    });
  }

  static _styleChatMessageBackground(root, message) {
    const flags =
      message.flags?.daggerheart || message.flags?.["daggerheart-unofficial"];
    if (!flags) return;

    const chatMessage = root.classList?.contains("chat-message")
      ? root
      : root.closest(".chat-message");
    if (!chatMessage) return;

    if (flags.rollType === "hope" || flags.isHope) {
      chatMessage.classList.add("hope");
      EnhancedDiceStyling._styleRollEffectText(chatMessage, "hope");
    } else if (flags.rollType === "fear" || flags.isFear) {
      chatMessage.classList.add("fear");
      EnhancedDiceStyling._styleRollEffectText(chatMessage, "fear");
    } else if (flags.isCrit) {
      chatMessage.classList.add("critical");
      EnhancedDiceStyling._styleRollEffectText(chatMessage, "critical");
    }

    if (flags.isDuality) {
      chatMessage.classList.add("duality");
    }
  }

  static _styleRollEffectText(chatMessage, rollType) {
    const rollEffectElements = chatMessage.querySelectorAll(".roll-effect");
    if (rollEffectElements.length > 0) {
      rollEffectElements.forEach((el) => {
        const text = (el.textContent || "").toLowerCase();

        if (text.includes("hope") && rollType === "hope") {
          el.classList.add("hope-effect");
        } else if (text.includes("fear") && rollType === "fear") {
          el.classList.add("fear-effect");
        } else if (
          rollType === "hope" &&
          (text.includes("gain") || text.includes("add"))
        ) {
          el.classList.add("hope-effect");
        } else if (
          rollType === "fear" &&
          (text.includes("gain") || text.includes("add"))
        ) {
          el.classList.add("fear-effect");
        } else if (rollType === "critical") {
          el.classList.add("critical-effect");
        }
      });
    }
  }

  static _addClickableRerollHandlers(root, message) {
    const flags =
      message.flags?.daggerheart || message.flags?.["daggerheart-unofficial"];
    if (!flags || !flags.isDuality) return;

    const diceTooltip = root.querySelector(".dice-tooltip");
    if (diceTooltip && !diceTooltip.querySelector(".reroll-instruction")) {
      const hope = game.i18n.localize("DAGGERHEART.GENERAL.hope");
      const fear = game.i18n.localize("DAGGERHEART.GENERAL.fear");
      const instructionText = document.createElement("div");
      instructionText.className = "reroll-instruction";
      instructionText.innerHTML = `
          <i class="fas fa-info-circle"></i> Click ${hope}/${fear} to reroll
        `;
      const wrapper = diceTooltip.querySelector(".wrapper");
      if (wrapper && wrapper.parentElement) {
        wrapper.parentElement.insertBefore(instructionText, wrapper);
      }
    }

    const hopeDice = root.querySelectorAll(
      '.dice.color-hope[data-type="hope"]'
    );
    const fearDice = root.querySelectorAll(
      '.dice.color-fear[data-type="fear"]'
    );

    hopeDice.forEach((die) => {
      die.classList.add("clickable-die", "hope-die");
      if (!die.dataset.rerollBound) {
        die.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (die.classList.contains("rerolling")) return;

          await EnhancedDiceStyling._handleDiceReroll(die, "hope", message);
        });
        die.dataset.rerollBound = "1";
      }
    });

    fearDice.forEach((die) => {
      die.classList.add("clickable-die", "fear-die");
      if (!die.dataset.rerollBound) {
        die.addEventListener("click", async (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (die.classList.contains("rerolling")) return;

          await EnhancedDiceStyling._handleDiceReroll(die, "fear", message);
        });
        die.dataset.rerollBound = "1";
      }
    });
  }

  static async _handleDiceReroll(dieElement, dieType, message) {
    const dieLabel =
      dieType === "hope"
        ? game.i18n.localize("DAGGERHEART.GENERAL.hope")
        : game.i18n.localize("DAGGERHEART.GENERAL.fear");

    const confirmResult = await Dialog.confirm({
      title: `${game.i18n.localize("DAGGERHEART.GENERAL.reroll")} ${dieLabel}`,
      content:
        `<p>${game.i18n.localize("DAGGERHEART.GENERAL.reroll")} ${dieLabel}?` +
        `</p>`,
      yes: () => true,
      no: () => false,
      defaultYes: false,
    });

    if (!confirmResult) return;

    dieElement.classList.add("rerolling");

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      dieElement.classList.remove("rerolling");
      dieElement.classList.add("rerolled");

      if (!dieElement.querySelector(".dice-rerolled")) {
        const span = document.createElement("span");
        span.className = "dice-rerolled";
        span.innerHTML = '<i class="fas fa-redo"></i>';
        dieElement.appendChild(span);
      }

      setTimeout(() => {
        dieElement.classList.remove("rerolled");
      }, 1000);

      ui.notifications.info(
        `${dieLabel} ${game.i18n
          .localize("DAGGERHEART.GENERAL.reroll")
          .toLowerCase()}!`
      );
    } catch (error) {
      console.error("Dice reroll failed:", error);
      ui.notifications.error("Failed to reroll die");
    } finally {
      dieElement.classList.remove("rerolling");
    }
  }

  static _setupExpandableRolls(root) {
    const expandableRolls = root.querySelectorAll('[data-action="expandRoll"]');

    expandableRolls.forEach((el) => {
      if (!el.dataset.expandBound) {
        el.addEventListener("click", (event) => {
          event.preventDefault();
          el.classList.toggle("expanded");

          const content = el.querySelector(".roll-part-content.dice-result");
          if (content) {
            const expanded = el.classList.contains("expanded");

            content.style.display = expanded ? "none" : "";
          }
        });
        el.dataset.expandBound = "1";
      }
    });
  }

  static _setupRollSelectionHandlers(root) {
    const advantageChips = root.querySelectorAll(".advantage-chip");
    const disadvantageChips = root.querySelectorAll(".disadvantage-chip");

    advantageChips.forEach((chip) => {
      chip.addEventListener("click", (event) => {
        chip.classList.toggle("selected");
        const siblings =
          chip.parentElement?.querySelectorAll(".advantage-chip") || [];
        siblings.forEach?.((sib) => {
          if (sib !== chip) sib.classList.remove("selected");
        });
      });
    });

    disadvantageChips.forEach((chip) => {
      chip.addEventListener("click", (event) => {
        chip.classList.toggle("selected");
        const siblings =
          chip.parentElement?.querySelectorAll(".disadvantage-chip") || [];
        siblings.forEach?.((sib) => {
          if (sib !== chip) sib.classList.remove("selected");
        });
      });
    });

    const diceOptions = root.querySelectorAll(".dice-option");
    diceOptions.forEach((option) => {
      option.addEventListener("mouseenter", () => {
        option.querySelector(".dice-icon")?.classList.add("animated");
      });
      option.addEventListener("mouseleave", () => {
        option.querySelector(".dice-icon")?.classList.remove("animated");
      });
    });

    const reactionController = root.querySelector(".reaction-roll-controller");
    if (reactionController && !reactionController.dataset.clickBound) {
      reactionController.addEventListener("click", () => {
        reactionController.classList.toggle("active");

        if (reactionController.classList.contains("active")) {
          ui.notifications.info("Reaction roll mode activated");
        } else {
          ui.notifications.info("Reaction roll mode deactivated");
        }
      });
      reactionController.dataset.clickBound = "1";
    }

    const rollButton = root.querySelector(".roll-button.primary");
    if (rollButton && !rollButton.dataset.clickBound) {
      rollButton.addEventListener("click", (event) => {
        rollButton.classList.add("rolling");

        setTimeout(() => {
          rollButton.classList.remove("rolling");
        }, 1000);
      });
      rollButton.dataset.clickBound = "1";
    }
  }

  static _addDualityRollButtonHandlers(html) {
    const dualityButtons = html.querySelectorAll('[data-action*="duality"]');

    dualityButtons.forEach((button) => {
      if (!button.dataset.dualityBound) {
        button.addEventListener("click", (event) => {
          event.preventDefault();

          button.classList.add("processing");

          setTimeout(() => {
            button.classList.remove("processing");
          }, 500);
        });
        button.dataset.dualityBound = "1";
      }
    });
  }
}


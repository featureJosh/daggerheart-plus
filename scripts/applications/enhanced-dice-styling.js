export class EnhancedDiceStyling {
  static initialize() {
    Hooks.on("renderChatMessage", EnhancedDiceStyling._onRenderChatMessage);
    Hooks.on("renderApplication", EnhancedDiceStyling._onRenderApplication);
  }

  static _onRenderChatMessage(message, html, data) {
    if (
      !message.flags?.daggerheart &&
      !message.flags?.["daggerheart-unofficial"]
    )
      return;

    EnhancedDiceStyling._styleDiceTooltips(html);
    EnhancedDiceStyling._styleChatMessageBackground(html, message);
    EnhancedDiceStyling._addClickableRerollHandlers(html, message);
    EnhancedDiceStyling._setupExpandableRolls(html);
  }

  static _onRenderApplication(app, html, data) {
    if (html.hasClass("roll-selection")) {
      EnhancedDiceStyling._setupRollSelectionHandlers(html);
    }
  }

  static _styleDiceTooltips(html) {
    const tooltipParts = html.find(
      ".dice-tooltip .wrapper .roll-dice .roll-die"
    );

    tooltipParts.each((index, part) => {
      const $part = $(part);
      const label = $part.find(".die-label");
      const diceElement = $part.find(".dice");

      if (diceElement.length > 0) {
        const t = diceElement.attr("data-type");
        if (t === "hope") {
          diceElement.addClass("hope-die").attr("data-flavor", game.i18n.localize("DAGGERHEART.GENERAL.hope"));
          label.addClass("hope-flavor");
          $part.addClass("hope-die-container");
        } else if (t === "fear") {
          diceElement.addClass("fear-die").attr("data-flavor", game.i18n.localize("DAGGERHEART.GENERAL.fear"));
          label.addClass("fear-flavor");
          $part.addClass("fear-die-container");
        }
      }
    });

    const rollFlavorLines = html.find(".roll-result-desc, .roll-title");
    rollFlavorLines.each((index, line) => {
      const $line = $(line);
      const text = $line.text().toLowerCase();

      if (text.includes("hope")) {
        $line.addClass("hope-result");
      } else if (text.includes("fear")) {
        $line.addClass("fear-result");
      } else if (text.includes("critical")) {
        $line.addClass("critical-result");
      }
    });
  }

  static _styleChatMessageBackground(html, message) {
    const flags =
      message.flags?.daggerheart || message.flags?.["daggerheart-unofficial"];
    if (!flags) return;

    const chatMessage = html.hasClass("chat-message")
      ? html
      : html.closest(".chat-message");
    if (!chatMessage.length) return;

    if (flags.rollType === "hope" || flags.isHope) {
      chatMessage.addClass("hope");
      EnhancedDiceStyling._styleRollEffectText(chatMessage, "hope");
    } else if (flags.rollType === "fear" || flags.isFear) {
      chatMessage.addClass("fear");
      EnhancedDiceStyling._styleRollEffectText(chatMessage, "fear");
    } else if (flags.isCrit) {
      chatMessage.addClass("critical");
      EnhancedDiceStyling._styleRollEffectText(chatMessage, "critical");
    }

    if (flags.isDuality) {
      chatMessage.addClass("duality");
    }
  }

  static _styleRollEffectText(chatMessage, rollType) {
    const rollEffectElements = chatMessage.find(".roll-effect");
    if (rollEffectElements.length > 0) {
      rollEffectElements.each(function () {
        const element = $(this);
        const text = element.text().toLowerCase();

        if (text.includes("hope") && rollType === "hope") {
          element.addClass("hope-effect");
        } else if (text.includes("fear") && rollType === "fear") {
          element.addClass("fear-effect");
        } else if (
          rollType === "hope" &&
          (text.includes("gain") || text.includes("add"))
        ) {
          element.addClass("hope-effect");
        } else if (
          rollType === "fear" &&
          (text.includes("gain") || text.includes("add"))
        ) {
          element.addClass("fear-effect");
        } else if (rollType === "critical") {
          element.addClass("critical-effect");
        }
      });
    }
  }

  static _addClickableRerollHandlers(html, message) {
    const flags =
      message.flags?.daggerheart || message.flags?.["daggerheart-unofficial"];
    if (!flags || !flags.isDuality) return;

    const diceTooltip = html.find(".dice-tooltip");
    if (
      diceTooltip.length > 0 &&
      !diceTooltip.find(".reroll-instruction").length
    ) {
      const hope = game.i18n.localize("DAGGERHEART.GENERAL.hope");
      const fear = game.i18n.localize("DAGGERHEART.GENERAL.fear");
      const instructionText = $(`
        <div class="reroll-instruction">
          <i class="fas fa-info-circle"></i> Click on the ${hope}/${fear} dice to reroll.
        </div>
      `);
      diceTooltip.find(".wrapper").before(instructionText);
    }

    const hopeDice = html.find('.dice.color-hope[data-type="hope"]');
    const fearDice = html.find('.dice.color-fear[data-type="fear"]');

    hopeDice.each((index, die) => {
      const $die = $(die);
      $die.addClass("clickable-die hope-die");
      $die.off("click.reroll").on("click.reroll", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if ($die.hasClass("rerolling")) return;

        await EnhancedDiceStyling._handleDiceReroll($die, "hope", message);
      });
    });

    fearDice.each((index, die) => {
      const $die = $(die);
      $die.addClass("clickable-die fear-die");
      $die.off("click.reroll").on("click.reroll", async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if ($die.hasClass("rerolling")) return;

        await EnhancedDiceStyling._handleDiceReroll($die, "fear", message);
      });
    });
  }

  static async _handleDiceReroll(dieElement, dieType, message) {
    const dieLabel =
      dieType === "hope"
        ? game.i18n.localize("DAGGERHEART.GENERAL.hope")
        : game.i18n.localize("DAGGERHEART.GENERAL.fear");

    const confirmResult = await Dialog.confirm({
      title: `${game.i18n.localize("DAGGERHEART.GENERAL.reroll")} ${dieLabel} ${game.i18n.localize("DAGGERHEART.GENERAL.die" ) || "Die"}`,
      content: `<p>${game.i18n.localize("DAGGERHEART.GENERAL.reroll")} ${dieLabel}?` +
        `</p>`,
      yes: () => true,
      no: () => false,
      defaultYes: false,
    });

    if (!confirmResult) return;

    dieElement.addClass("rerolling");

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      dieElement.removeClass("rerolling").addClass("rerolled");

      const rerolledIcon = $(
        '<span class="dice-rerolled"><i class="fas fa-redo"></i></span>'
      );
      if (!dieElement.find(".dice-rerolled").length) {
        dieElement.append(rerolledIcon);
      }

      setTimeout(() => {
        dieElement.removeClass("rerolled");
      }, 1000);

      ui.notifications.info(
        `${dieLabel} ${game.i18n.localize("DAGGERHEART.GENERAL.reroll").toLowerCase()}!`
      );
    } catch (error) {
      console.error("Dice reroll failed:", error);
      ui.notifications.error("Failed to reroll die");
    } finally {
      dieElement.removeClass("rerolling");
    }
  }

  static _setupExpandableRolls(html) {
    const expandableRolls = html.find('[data-action="expandRoll"]');

    expandableRolls.each((index, element) => {
      const $element = $(element);

      $element.off("click.expand").on("click.expand", function (event) {
        event.preventDefault();
        $element.toggleClass("expanded");

        const content = $element.find(".roll-part-content.dice-result");
        if ($element.hasClass("expanded")) {
          content.slideUp(250);
        } else {
          content.slideDown(250);
        }
      });
    });
  }

  static _setupRollSelectionHandlers(html) {
    const advantageChips = html.find(".advantage-chip");
    const disadvantageChips = html.find(".disadvantage-chip");

    advantageChips.on("click", function () {
      const $chip = $(this);
      $chip.toggleClass("selected");
      $chip.siblings(".advantage-chip").removeClass("selected");
    });

    disadvantageChips.on("click", function () {
      const $chip = $(this);
      $chip.toggleClass("selected");
      $chip.siblings(".disadvantage-chip").removeClass("selected");
    });

    const diceOptions = html.find(".dice-option");
    diceOptions.on("mouseenter", function () {
      const $option = $(this);
      $option.find(".dice-icon").addClass("animated");
    });

    diceOptions.on("mouseleave", function () {
      const $option = $(this);
      $option.find(".dice-icon").removeClass("animated");
    });

    const reactionController = html.find(".reaction-roll-controller");
    reactionController.on("click", function () {
      const $controller = $(this);
      $controller.toggleClass("active");

      if ($controller.hasClass("active")) {
        ui.notifications.info("Reaction roll mode activated");
      } else {
        ui.notifications.info("Reaction roll mode deactivated");
      }
    });

    const rollButton = html.find(".roll-button.primary");
    rollButton.on("click", function (event) {
      const $button = $(this);

      $button.addClass("rolling");

      setTimeout(() => {
        $button.removeClass("rolling");
      }, 1000);
    });
  }

  static _addDualityRollButtonHandlers(html) {
    const dualityButtons = html.find('[data-action*="duality"]');

    dualityButtons.each((index, button) => {
      const $button = $(button);

      $button.off("click.duality").on("click.duality", function (event) {
        event.preventDefault();

        $button.addClass("processing");

        setTimeout(() => {
          $button.removeClass("processing");
        }, 500);
      });
    });
  }
}

Hooks.once("ready", () => {
  EnhancedDiceStyling.initialize();
  console.log("Enhanced Dice Styling initialized");
});

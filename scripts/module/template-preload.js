export function preloadModuleTemplates() {
  try {
    foundry.applications.handlebars.loadTemplates([
      // Applications
      "modules/daggerheart-plus/templates/applications/floating-sheet-rail.hbs",

      // Chat Templates
      "modules/daggerheart-plus/templates/ui/chat/ability-use.hbs",
      "modules/daggerheart-plus/templates/ui/chat/action.hbs",
      "modules/daggerheart-plus/templates/ui/chat/apply-effects.hbs",
      "modules/daggerheart-plus/templates/ui/chat/damageSummary.hbs",
      "modules/daggerheart-plus/templates/ui/chat/deathMove.hbs",
      "modules/daggerheart-plus/templates/ui/chat/downtime.hbs",
      "modules/daggerheart-plus/templates/ui/chat/effectSummary.hbs",
      "modules/daggerheart-plus/templates/ui/chat/foundryRoll.hbs",
      "modules/daggerheart-plus/templates/ui/chat/foundryRollTooltip.hbs",
      "modules/daggerheart-plus/templates/ui/chat/groupRoll.hbs",
      "modules/daggerheart-plus/templates/ui/chat/refreshMessage.hbs",
      "modules/daggerheart-plus/templates/ui/chat/resource-roll.hbs",

      // Chat Parts
      "modules/daggerheart-plus/templates/ui/chat/parts/button-part.hbs",
      "modules/daggerheart-plus/templates/ui/chat/parts/damage-part.hbs",
      "modules/daggerheart-plus/templates/ui/chat/parts/roll-part.hbs",
      "modules/daggerheart-plus/templates/ui/chat/parts/target-part.hbs",
    ]);
  } catch (e) {
    console.warn("Daggerheart Plus | Failed to preload templates", e);
  }
}

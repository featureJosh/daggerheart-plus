export function preloadModuleTemplates() {
  try {
    foundry.applications.handlebars.loadTemplates([
      "modules/daggerheart-plus/templates/applications/floating-sheet-rail.hbs",
    ]);
  } catch (e) {
    console.warn("Daggerheart Plus | Failed to preload templates", e);
  }
}

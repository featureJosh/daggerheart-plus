export function preloadModuleTemplates() {
  try {
    loadTemplates([
      "modules/daggerheart-plus/templates/applications/floating-sheet-rail.hbs",
    ]);
  } catch (e) {
    console.warn("Daggerheart Plus | Failed to preload templates", e);
  }
}

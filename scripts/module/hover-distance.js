import { HoverDistance } from "../applications/hover-distance.js";

export function registerHoverDistanceSettings() {
  try {
    HoverDistance.registerSettings();
  } catch (e) {
    console.warn(
      "Daggerheart Plus | Failed to register HoverDistance settings",
      e
    );
  }
}

export function initializeHoverDistance() {
  try {
    HoverDistance.initHooks();
    console.log("Daggerheart Plus | Hover Distance feature enabled");
  } catch (e) {
    console.warn("Daggerheart Plus | Hover Distance failed to initialize", e);
  }
}

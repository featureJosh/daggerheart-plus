import { MODULE_ID } from "./constants.js";

export function registerGradientSettings() {
  const MOD = MODULE_ID;

  function buildLinearGradient(colors) {
    const cs = (colors || [])
      .filter(Boolean)
      .map((c) => c.trim())
      .filter((c) => c.length);
    if (!cs.length) return null;
    const n = cs.length - 1;
    const stops = cs.map((c, i) => {
      const pct = n <= 0 ? 100 * i : Math.round((i / n) * 100);
      return `${c} ${pct}%`;
    });
    return `linear-gradient(90deg, ${stops.join(", ")})`;
  }

  function parseColorList(str) {
    if (!str || typeof str !== "string") return [];

    const raw = str
      .split(/[\s,]+/g)
      .map((s) => s.trim())
      .filter(Boolean);

    const ok = raw.filter(
      (c) =>
        /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(c) ||
        /^rgb(a)?\(/i.test(c) ||
        /^hsl(a)?\(/i.test(c) ||
        /^var\(/i.test(c)
    );
    return ok;
  }

  function applyProgressBarGradients() {
    try {
      const hpStr = String(game.settings.get(MOD, "hpGradient") ?? "").trim();
      const stressStr = String(
        game.settings.get(MOD, "stressGradient") ?? ""
      ).trim();
      const armorStr = String(
        game.settings.get(MOD, "armorGradient") ?? ""
      ).trim();

      const hpG = buildLinearGradient(parseColorList(hpStr));
      const stressG = buildLinearGradient(parseColorList(stressStr));
      const armorG = buildLinearGradient(parseColorList(armorStr));

      const id = "dhp-progress-gradients";
      let style = document.getElementById(id);
      if (!style) {
        style = document.createElement("style");
        style.id = id;
        document.head.appendChild(style);
      }
      const lines = [];
      lines.push(".daggerheart-plus.sheet{");
      if (hpG) lines.push("--dhp-hp-gradient:" + hpG + ";");
      if (stressG) lines.push("--dhp-stress-gradient:" + stressG + ";");
      if (armorG) lines.push("--dhp-armor-gradient:" + armorG + ";");
      lines.push("}");
      style.textContent = lines.join("");
    } catch (e) {
      console.warn("Daggerheart Plus | Failed applying gradient settings", e);
    }
  }

  Hooks.once("init", () => {
    try {
      game.settings.register(MOD, "hpGradient", {
        name: "DHP.Settings.ProgressGradients.HP.Name",
        hint: "DHP.Settings.ProgressGradients.HP.Hint",
        scope: "client",
        config: true,
        type: String,
        default: "",
        onChange: () => applyProgressBarGradients(),
      });
      game.settings.register(MOD, "stressGradient", {
        name: "DHP.Settings.ProgressGradients.Stress.Name",
        hint: "DHP.Settings.ProgressGradients.Stress.Hint",
        scope: "client",
        config: true,
        type: String,
        default: "",
        onChange: () => applyProgressBarGradients(),
      });
      game.settings.register(MOD, "armorGradient", {
        name: "DHP.Settings.ProgressGradients.Armor.Name",
        hint: "DHP.Settings.ProgressGradients.Armor.Hint",
        scope: "client",
        config: true,
        type: String,
        default: "",
        onChange: () => applyProgressBarGradients(),
      });
    } catch (e) {
      console.error(
        "Daggerheart Plus | Failed registering gradient settings",
        e
      );
    }
  });

  Hooks.on("ready", () => applyProgressBarGradients());

  Hooks.on("updateSetting", (setting) => {
    if (setting?.namespace !== MOD) return;
    if (
      ["hpGradient", "stressGradient", "armorGradient"].includes(setting?.key)
    ) {
      applyProgressBarGradients();
    }
  });
}

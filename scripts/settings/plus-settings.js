export class DHPPlusUIConfig extends foundry.abstract.DataModel {
  static defineSchema() {
    const { fields } = foundry.data;
    return {
      // Feature toggles managed at the world level
      features: new fields.SchemaField({
        fearTracker: new fields.BooleanField({
          required: true,
          initial: false,
          label: "DHP.Settings.UIConfig.features.fearTracker.label",
          hint: "DHP.Settings.UIConfig.features.fearTracker.hint",
        }),
      }),

      // Sheet sizing presets (world-defaults)
      sheets: new fields.SchemaField({
        default: new fields.SchemaField({
          width: new fields.NumberField({
            integer: true,
            min: 400,
            max: 2000,
            step: 10,
            initial: 900,
            label: "DHP.Settings.UIConfig.sheets.default.width.label",
            hint: "DHP.Settings.UIConfig.sheets.default.width.hint",
          }),
          height: new fields.NumberField({
            integer: true,
            min: 300,
            max: 1600,
            step: 10,
            initial: 800,
            label: "DHP.Settings.UIConfig.sheets.default.height.label",
            hint: "DHP.Settings.UIConfig.sheets.default.height.hint",
          }),
        }),
        adversary: new fields.SchemaField({
          width: new fields.NumberField({
            integer: true,
            min: 400,
            max: 2000,
            step: 10,
            initial: 630,
            label: "DHP.Settings.UIConfig.sheets.adversary.width.label",
            hint: "DHP.Settings.UIConfig.sheets.adversary.width.hint",
          }),
          height: new fields.NumberField({
            integer: true,
            min: 300,
            max: 1600,
            step: 10,
            initial: 820,
            label: "DHP.Settings.UIConfig.sheets.adversary.height.label",
            hint: "DHP.Settings.UIConfig.sheets.adversary.height.hint",
          }),
        }),
      }),
    };
  }
}

export class DHPPlusUIConfigApp extends foundry.applications.api.HandlebarsApplicationMixin(
  foundry.applications.api.ApplicationV2
) {
  constructor() {
    super({});
    const data = game.settings.get("daggerheart-plus", "uiConfig");
    // If no value stored yet, instantiate with defaults
    this.settings = new DHPPlusUIConfig(data ? data.toObject?.() ?? data : {});
  }

  static DEFAULT_OPTIONS = {
    tag: "form",
    id: "daggerheart-plus-ui-config",
    classes: ["daggerheart-plus", "dhp-style", "dialog", "setting"],
    position: { width: 520, height: "auto" },
    window: { icon: "fa-solid fa-sliders" },
    form: { handler: this.updateData, submitOnChange: true },
    actions: { reset: this.reset, save: this.save },
  };

  static PARTS = {
    body: { template: "modules/daggerheart-plus/templates/applications/plus-settings.hbs" },
  };

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    ctx.settingFields = this.settings;
    return ctx;
  }

  static async updateData(event, element, formData) {
    const updated = foundry.utils.expandObject(formData.object);
    await this.settings.updateSource(updated);
    this.render();
  }

  static async reset() {
    this.settings = new DHPPlusUIConfig();
    this.render();
  }

  static async save() {
    await game.settings.set(
      "daggerheart-plus",
      "uiConfig",
      this.settings.toObject()
    );
    this.close();
  }
}


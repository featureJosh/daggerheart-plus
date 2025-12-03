export default class DhpTokenEffects extends foundry.abstract.DataModel {
    static LOCALIZATION_PREFIXES = ['DHP.Settings.TokenEffects'];

    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            halo: new fields.SchemaField({
                enabled: new fields.BooleanField({
                    required: true,
                    initial: true,
                    label: 'DHP.Settings.TokenEffects.Halo.Name'
                }),
                iconSize: new fields.NumberField({
                    required: true,
                    integer: true,
                    initial: 18,
                    min: 12,
                    max: 32,
                    step: 1,
                    label: 'DHP.Settings.TokenEffects.Halo.Size.Name'
                }),
                spacing: new fields.NumberField({
                    required: true,
                    initial: 0.85,
                    min: 0.5,
                    max: 1.5,
                    step: 0.05,
                    label: 'DHP.Settings.TokenEffects.Halo.Spacing.Name'
                })
            })
        };
    }
}


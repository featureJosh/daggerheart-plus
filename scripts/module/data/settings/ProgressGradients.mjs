export default class DhpProgressGradients extends foundry.abstract.DataModel {
    static LOCALIZATION_PREFIXES = ['DHP.Settings.ProgressGradients'];

    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            hp: new fields.StringField({
                required: true,
                initial: '',
                label: 'DHP.Settings.ProgressGradients.HP.Name'
            }),
            stress: new fields.StringField({
                required: true,
                initial: '',
                label: 'DHP.Settings.ProgressGradients.Stress.Name'
            }),
            armor: new fields.StringField({
                required: true,
                initial: '',
                label: 'DHP.Settings.ProgressGradients.Armor.Name'
            })
        };
    }
}


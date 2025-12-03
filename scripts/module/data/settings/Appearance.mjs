export default class DhpAppearance extends foundry.abstract.DataModel {
    static LOCALIZATION_PREFIXES = ['DHP.Settings.Appearance'];

    static defineSchema() {
        const fields = foundry.data.fields;
        return {
            enhancedChat: new fields.BooleanField({
                required: true,
                initial: true,
                label: 'DHP.Settings.EnhancedChat.Enable.Name'
            }),
            particles: new fields.BooleanField({
                required: true,
                initial: true,
                label: 'DHP.Settings.Particles.Enable.Name'
            }),
            tooltipCardMaxWidth: new fields.NumberField({
                required: true,
                integer: true,
                initial: 304,
                min: 220,
                max: 640,
                step: 10,
                label: 'DHP.Settings.Appearance.TooltipCardMaxWidth.Name'
            }),
            characterSheetSidebars: new fields.BooleanField({
                required: true,
                initial: true,
                label: 'DHP.Settings.Appearance.CharacterSheetSidebars.Name'
            }),
            resourcePips: new fields.BooleanField({
                required: true,
                initial: false,
                label: 'DHP.Settings.ResourcePips.Name'
            }),
            alwaysShowLoadoutCounters: new fields.BooleanField({
                required: true,
                initial: false,
                label: 'DHP.Settings.Appearance.AlwaysShowLoadoutCounters.Name'
            }),
            alwaysOpenDomainCards: new fields.BooleanField({
                required: true,
                initial: false,
                label: 'DHP.Settings.Moves.AlwaysOpen.Name'
            })
        };
    }
}


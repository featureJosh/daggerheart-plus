export function createDaggerheartPlusCharacterSheet() {
  const BaseCharacterSheet = game.system.api?.applications?.sheets?.actors?.Character || foundry.applications.sheets.ActorSheetV2;
  
  return class DaggerheartPlusCharacterSheet extends BaseCharacterSheet {
    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      classes: [...(super.DEFAULT_OPTIONS.classes || ['sheet', 'actor']), 'daggerheart-plus']
    };

    static PARTS = {
      ...super.PARTS,
      sidebar: {
        id: 'sidebar',
        template: 'modules/daggerheart-plus/templates/character/sidebar.hbs'
      },
      header: {
        id: 'header',
        template: 'modules/daggerheart-plus/templates/character/header.hbs'
      },
      features: {
        id: 'features',
        template: 'modules/daggerheart-plus/templates/character/features.hbs'
      },
      loadout: {
        id: 'loadout',
        template: 'modules/daggerheart-plus/templates/character/loadout.hbs'
      },
      inventory: {
        id: 'inventory',
        template: 'modules/daggerheart-plus/templates/character/inventory.hbs'
      },
      biography: {
        id: 'biography',
        template: 'modules/daggerheart-plus/templates/character/biography.hbs'
      },
      effects: {
        id: 'effects',
        template: 'modules/daggerheart-plus/templates/character/effects.hbs'
      }
    };

    get title() {
      return `${this.document.name} [DH+]`;
    }
  };
}

export const DaggerheartPlusCharacterSheet = createDaggerheartPlusCharacterSheet();
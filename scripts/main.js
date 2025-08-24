import { CounterUI } from './applications/counter-ui.js';
import { TokenCounterUI } from './applications/token-counter-ui.js';

const MODULE_ID = 'daggerheart-plus';
const SYSTEM_ID = 'daggerheart';

Hooks.once('init', () => {
  console.log('Daggerheart Plus | Initializing module');
  

});

Hooks.once('ready', async () => {
  console.log('Daggerheart Plus | Module ready - creating enhanced sheets');
  
  const documentSheetConfig = foundry.applications.apps.DocumentSheetConfig;
  const systemAPI = game.system.api?.applications?.sheets?.actors;
  
  if (!systemAPI) {
    ui.notifications.error('Daggerheart Plus | System API not available');
    return;
  }

  const DaggerheartPlusCharacterSheet = class extends systemAPI.Character {
    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      classes: [...(super.DEFAULT_OPTIONS.classes || []), 'daggerheart-plus']
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

  const DaggerheartPlusAdversarySheet = class extends systemAPI.Adversary {
    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      classes: [...(super.DEFAULT_OPTIONS.classes || []), 'daggerheart-plus']
    };

    get title() {
      return `${this.document.name} [DH+]`;
    }
  };

  const DaggerheartPlusCompanionSheet = class extends systemAPI.Companion {
    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      classes: [...(super.DEFAULT_OPTIONS.classes || []), 'daggerheart-plus']
    };

    get title() {
      return `${this.document.name} [DH+]`;
    }
  };

  const DaggerheartPlusEnvironmentSheet = class extends systemAPI.Environment {
    static DEFAULT_OPTIONS = {
      ...super.DEFAULT_OPTIONS,
      classes: [...(super.DEFAULT_OPTIONS.classes || []), 'daggerheart-plus']
    };

    get title() {
      return `${this.document.name} [DH+]`;
    }
  };
  
  documentSheetConfig.registerSheet(
    Actor,
    SYSTEM_ID,
    DaggerheartPlusCharacterSheet,
    {
      types: ['character'],
      label: 'DHP.CharacterSheet',
      makeDefault: true
    }
  );
  
  documentSheetConfig.registerSheet(
    Actor,
    SYSTEM_ID,
    DaggerheartPlusAdversarySheet,
    {
      types: ['adversary'],
      label: 'DHP.AdversarySheet',
      makeDefault: true
    }
  );
  
  documentSheetConfig.registerSheet(
    Actor,
    SYSTEM_ID,
    DaggerheartPlusCompanionSheet,
    {
      types: ['companion'],
      label: 'DHP.CompanionSheet',
      makeDefault: true
    }
  );
  
  documentSheetConfig.registerSheet(
    Actor,
    SYSTEM_ID,
    DaggerheartPlusEnvironmentSheet,
    {
      types: ['environment'],
      label: 'DHP.EnvironmentSheet',
      makeDefault: true
    }
  );
  
  console.log('Daggerheart Plus | Enhanced sheets registered successfully');
  
  setTimeout(async () => {
    const fearTracker = new CounterUI();
    await fearTracker.initialize();
    
    const tokenCounter = new TokenCounterUI();
    await tokenCounter.initialize();
    
    window.daggerheartPlus = {
      fearTracker,
      tokenCounter
    };
    
    console.log('Daggerheart Plus | Counter systems initialized');
    
    try {
      const currentAppearance = game.settings.get('daggerheart', 'Appearance');
      if (currentAppearance && currentAppearance.displayFear !== 'hide') {
        console.log('Daggerheart Plus | Hiding system fear tracker');
        const newAppearance = { ...currentAppearance, displayFear: 'hide' };
        await game.settings.set('daggerheart', 'Appearance', newAppearance);
        console.log('Daggerheart Plus | System fear tracker hidden');
        if (game.user.isGM) {
          ui.notifications.info('Daggerheart Plus | System fear tracker hidden - using custom tracker instead');
        }
      }
    } catch (error) {
      console.warn('Daggerheart Plus | Could not hide system fear tracker:', error);
    }
  }, 1000);
  
  if (game.user.isGM) {
    ui.notifications.info('Daggerheart Plus module loaded successfully!');
  }
});

Hooks.on('renderActorSheet', (app, html, data) => {
  if (app.constructor.name.startsWith('DaggerheartPlus')) {
    console.log(`Daggerheart Plus | Rendering ${app.constructor.name}`);
  }
});

let originalFearDisplay = null;

Hooks.once('ready', async () => {
  try {
    const currentAppearance = game.settings.get('daggerheart', 'Appearance');
    if (currentAppearance && currentAppearance.displayFear) {
      originalFearDisplay = currentAppearance.displayFear;
      console.log('Daggerheart Plus | Stored original fear display setting:', originalFearDisplay);
    }
  } catch (error) {
    console.warn('Daggerheart Plus | Could not store original fear display setting:', error);
  }
});

Hooks.once('disable', async () => {
  if (originalFearDisplay && originalFearDisplay !== 'hide') {
    try {
      console.log('Daggerheart Plus | Restoring original fear display setting:', originalFearDisplay);
      const currentAppearance = game.settings.get('daggerheart', 'Appearance');
      if (currentAppearance) {
        const newAppearance = { ...currentAppearance, displayFear: originalFearDisplay };
        await game.settings.set('daggerheart', 'Appearance', newAppearance);
        console.log('Daggerheart Plus | Original fear display setting restored');
        if (game.user.isGM) {
          ui.notifications.info(`Daggerheart Plus | Fear display setting restored to: ${originalFearDisplay}`);
        }
      }
    } catch (error) {
      console.warn('Daggerheart Plus | Could not restore original fear display setting:', error);
    }
  }
});


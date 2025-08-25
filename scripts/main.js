import { CounterUI } from './applications/counter-ui.js';
import { TokenCounterUI } from './applications/token-counter-ui.js';
import { EnhancedDiceStyling } from './applications/enhanced-dice-styling.js';

const MODULE_ID = 'daggerheart-plus';
const SYSTEM_ID = 'daggerheart';

Hooks.once('init', () => {
  console.log('Daggerheart Plus | Initializing module');
  
  if (game.system.id !== SYSTEM_ID) {
    console.error('Daggerheart Plus | This module requires the Daggerheart system');
    return;
  }
  
  game.settings.register(MODULE_ID, 'enableFearTracker', {
    name: 'DHP.Settings.ExperimentalFeatures.FearTracker.Name',
    hint: 'DHP.Settings.ExperimentalFeatures.FearTracker.Hint',
    scope: 'world',
    config: true,
    type: Boolean,
    default: false,
    onChange: value => {
      console.log('Daggerheart Plus | Fear tracker setting changed:', value);
      if (window.daggerheartPlus?.manageFearTracker) {
        window.daggerheartPlus.manageFearTracker();
      }
    }
  });
  
  console.log('Daggerheart Plus | Module settings registered');
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
  
  const tokenCounter = new TokenCounterUI();
  await tokenCounter.initialize();
  
  EnhancedDiceStyling.initialize();
  
  window.daggerheartPlus = {
    fearTracker: null,
    tokenCounter,
    manageFearTracker: null,
    enhancedDiceStyling: EnhancedDiceStyling
  };
  
  console.log('Daggerheart Plus | Token counter and enhanced dice styling initialized');
  
  async function manageFearTracker() {
    try {
      const useFearTracker = game.settings.get(MODULE_ID, 'enableFearTracker');
      
      if (useFearTracker) {
        console.log('Daggerheart Plus | Fear tracker enabled');
        
        if (!window.daggerheartPlus.fearTracker) {
          window.daggerheartPlus.fearTracker = new CounterUI();
          await window.daggerheartPlus.fearTracker.initialize();
        }
        window.daggerheartPlus.fearTracker.render();
      } else {
        if (window.daggerheartPlus.fearTracker) {
          window.daggerheartPlus.fearTracker.dispose();
          window.daggerheartPlus.fearTracker = null;
        }
      }
    } catch (error) {
      console.error('Daggerheart Plus | Error managing fear tracker:', error);
    }
  }
  
  window.daggerheartPlus.manageFearTracker = manageFearTracker;
  
  await manageFearTracker();
  
  Hooks.on('updateSetting', async (setting) => {
    if (setting.key === 'enableFearTracker' && setting.namespace === MODULE_ID) {
      await manageFearTracker();
    }
  });
  
  if (game.user.isGM) {
    ui.notifications.info('Daggerheart Plus module loaded successfully!');
  }
});

Hooks.on('renderActorSheet', (app, html, data) => {
  if (app.constructor.name.startsWith('DaggerheartPlus')) {
    console.log(`Daggerheart Plus | Rendering ${app.constructor.name}`);
  }
});




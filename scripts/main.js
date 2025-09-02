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
      tabs: {
        id: 'tabs',
        classes: ['tabs-right'],
        template: 'modules/daggerheart-plus/templates/shared/sidebar-tabs.hbs'
      },
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

    // --- Tabs Implementation ---
    static TABS = [
      { tab: 'features', label: 'Features', icon: 'fas fa-list' },
      { tab: 'loadout', label: 'Loadout', icon: 'fas fa-chess-rook' },
      { tab: 'inventory', label: 'Inventory', icon: 'fas fa-bag-shopping' },
      { tab: 'effects', label: 'Effects', icon: 'fas fa-bolt' },
      { tab: 'biography', label: 'Biography', icon: 'fas fa-feather' }
    ];

    tabGroups = { primary: 'features' };

    _getTabs() {
      return this.constructor.TABS.reduce((tabs, { tab, condition, ...config }) => {
        if (!condition || condition(this.document)) tabs[tab] = {
          ...config,
          id: tab,
          group: 'primary',
          active: this.tabGroups.primary === tab,
          cssClass: this.tabGroups.primary === tab ? 'active' : ''
        };
        return tabs;
      }, {});
    }

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.tabs = this._getTabs();
      return context;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      // Attach tab button handlers
      const root = this.element;
      if (!root) return;
      const tabButtons = root.querySelectorAll('nav.tabs[data-group="primary"] .item.control');
      tabButtons.forEach(btn => {
        btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          const tab = btn.dataset.tab;
          if (!tab) return;
          this.tabGroups.primary = tab;
          this._showSection(tab);
          tabButtons.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
        });
      });
      // Ensure correct initial section
      this._showSection(this.tabGroups.primary);

      // Apply background images to sidebar loadout items (simple, no observers)
      this._applySidebarLoadoutBackgrounds();
    }

    _showSection(sectionName) {
      const allSections = ['features', 'loadout', 'inventory', 'biography', 'effects'];
      const bodyElement = this.element?.querySelector('.sheet-body');
      if (!bodyElement) return;
      allSections.forEach(section => {
        const sectionElement = bodyElement.querySelector(`[data-tab="${section}"]`) ||
          bodyElement.querySelector(`.${section}-content`) ||
          bodyElement.querySelector(`#${section}`);
        if (sectionElement) sectionElement.style.display = section === sectionName ? 'block' : 'none';
      });
      const activeContent = bodyElement.querySelector(`[data-tab="${sectionName}"]`) ||
        bodyElement.querySelector(`.${sectionName}-content`) ||
        bodyElement.querySelector(`#${sectionName}`);
      if (activeContent) activeContent.style.display = 'block';
    }

    /**
     * Minimal: read each loadout item's image and expose it as a CSS var
     * on the list item so CSS can paint the card background.
     */
    _applySidebarLoadoutBackgrounds() {
      try {
        const root = this.element;
        if (!root) return;
        const items = root.querySelectorAll('.character-sidebar-sheet .loadout-section .inventory-item');
        if (!items?.length) return;

        items.forEach((el) => {
          // Prefer the owning document's image via data-item-id
          const id = el.dataset?.itemId;
          let src = id ? this.document?.items?.get?.(id)?.img : undefined;
          // Fallback to the inline <img>
          if (!src) {
            const img = el.querySelector?.('.item-img, .item-image, img');
            src = img?.getAttribute?.('src') || img?.dataset?.src || img?.currentSrc;
          }
          if (!src) return;

          const url = `url("${src}")`;
          el.style.setProperty('--sidebar-card-bg', url);
          // Defensive inline background to avoid shorthand overrides
          el.style.setProperty('background-image', url, 'important');
          el.style.setProperty('background-size', 'cover', 'important');
          el.style.setProperty('background-position', 'center', 'important');
          el.style.setProperty('background-repeat', 'no-repeat', 'important');
        });
      } catch (_) { /* noop */ }
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

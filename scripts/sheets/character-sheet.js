import { FloatingSheetNavigation } from '../applications/floating-sheet-navigation.js';
import DomainAbilitySidebar from '../applications/domain-ability-sidebar.js';
import HeaderLoadoutBar from '../applications/header-loadout-bar.js';

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

    constructor(options = {}) {
      super(options);
      this.currentSection = 'features';
      this.floatingNav = null;
      this.domainSidebar = null;
      this.headerLoadout = null;
    }

    get title() {
      return `${this.document.name} [DH+]`;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      await this._createFloatingNavigation();
      this._showSection(this.currentSection);
      
      if (game.settings.get('daggerheart-plus', 'enableDomainSidebar')) {
        this._renderDomainSidebar();
      }
      
      if (game.settings.get('daggerheart-plus', 'enableHeaderLoadout')) {
        this._renderHeaderLoadout();
      }
    }

    async _createFloatingNavigation() {
      if (this.floatingNav) {
        await this.floatingNav.close();
      }
      
      this.floatingNav = new FloatingSheetNavigation(this);
      await this.floatingNav.render(true);
    }

    _renderDomainSidebar() {
      if (this.domainSidebar) {
        this.domainSidebar.close();
      }
      
      this.domainSidebar = new DomainAbilitySidebar(this.actor);
      this.domainSidebar.render(true);
    }

    _renderHeaderLoadout() {
      if (this.headerLoadout) {
        this.headerLoadout.close();
      }
      
      this.headerLoadout = new HeaderLoadoutBar(this.actor);
      this.headerLoadout.render(true);
    }

    _switchToSection(sectionName) {
      if (this.currentSection === sectionName) return;
      
      this.currentSection = sectionName;
      this._showSection(sectionName);
      
      if (this.floatingNav) {
        this.floatingNav.setActiveSection(sectionName);
      }
    }

    _showSection(sectionName) {
      const allSections = ['features', 'loadout', 'inventory', 'biography', 'effects'];
      const bodyElement = this.element.querySelector('.sheet-body');
      
      if (!bodyElement) return;

      allSections.forEach(section => {
        const sectionElement = bodyElement.querySelector(`[data-tab="${section}"]`) || 
                              bodyElement.querySelector(`.${section}-content`) ||
                              bodyElement.querySelector(`#${section}`);
        
        if (sectionElement) {
          sectionElement.style.display = section === sectionName ? 'block' : 'none';
        }
      });

      const activeContent = bodyElement.querySelector(`[data-tab="${sectionName}"]`) || 
                           bodyElement.querySelector(`.${sectionName}-content`) ||
                           bodyElement.querySelector(`#${sectionName}`);
      
      if (activeContent) {
        activeContent.style.display = 'block';
      }
    }

    async close(options = {}) {
      if (this.floatingNav) {
        await this.floatingNav.close();
        this.floatingNav = null;
      }
      
      if (this.domainSidebar) {
        await this.domainSidebar.close();
        this.domainSidebar = null;
      }
      
      if (this.headerLoadout) {
        await this.headerLoadout.close();
        this.headerLoadout = null;
      }
      
      return super.close(options);
    }
  };
}

export const DaggerheartPlusCharacterSheet = createDaggerheartPlusCharacterSheet();
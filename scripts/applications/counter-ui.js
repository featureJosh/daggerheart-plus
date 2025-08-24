export class CounterUI {
    constructor() {
        this.element = null;
        this.refreshInterval = null;
        this.lastKnownValue = 0;
    }

    async initialize() {
        console.log('Fear Tracker | Initializing...');
        
        Hooks.on('settingChange', (moduleId, key, value) => {
            if (moduleId === 'daggerheart' && key === 'ResourcesFear') {
                console.log('Fear Tracker | Setting changed:', value);
                this.updateDisplay();
            }
        });

        // Also listen for any game setting changes as a backup
        Hooks.on('updateSetting', (setting, value) => {
            if (setting.key === 'ResourcesFear' && setting.namespace === 'daggerheart') {
                console.log('Fear Tracker | UpdateSetting hook:', value);
                this.updateDisplay();
            }
        });

        // Try rendering immediately and on ready
        setTimeout(() => this.render(), 1000);
        Hooks.once('ready', () => {
            console.log('Fear Tracker | Ready hook triggered');
            this.render();
            
            // Start periodic display refresh to ensure sync
            this.startPeriodicRefresh();
        });
    }

    get fearValue() {
        try {
            return game.settings.get('daggerheart', 'ResourcesFear') || 0;
        } catch (error) {
            console.warn('Fear Tracker | Error getting fear value:', error);
            return 0;
        }
    }

    get canModify() {
        return game.user.isGM || game.user.hasRole('ASSISTANT');
    }

    async render() {
        console.log('Fear Tracker | Attempting to render...');
        
        if (this.element) {
            console.log('Fear Tracker | Removing existing element');
            this.element.remove();
        }

        const hotbar = document.querySelector('#ui-bottom #hotbar') || document.querySelector('#hotbar');
        console.log('Fear Tracker | Hotbar found:', !!hotbar);
        
        if (!hotbar) {
            console.log('Fear Tracker | Hotbar not found, retrying in 1s');
            setTimeout(() => this.render(), 1000);
            return;
        }

        const container = document.createElement('div');
        container.id = 'counters-wrapper';
        container.className = 'counters-wrapper';
        
        this.element = document.createElement('div');
        this.element.id = 'counter-ui';
        this.element.className = 'faded-ui counter-ui fear-tracker';
        this.element.innerHTML = `
            <button type="button" class="counter-minus" title="Decrease" ${!this.canModify ? 'style="display:none"' : ''}>
                <i class="fas fa-minus"></i>
            </button>
            <div class="counter-display">
                <div class="counter-value">${this.fearValue}</div>
                <div class="counter-label">Fear</div>
            </div>
            <button type="button" class="counter-plus" title="Increase" ${!this.canModify ? 'style="display:none"' : ''}>
                <i class="fas fa-plus"></i>
            </button>
        `;

        container.appendChild(this.element);
        hotbar.parentNode.insertBefore(container, hotbar);
        
        console.log('Fear Tracker | Element created and inserted. Current fear value:', this.fearValue);
        console.log('Fear Tracker | Can modify:', this.canModify);
        
        // Initialize the last known value for periodic checking
        this.lastKnownValue = this.fearValue;

        this.setupEventListeners();
    }

    setupEventListeners() {
        if (!this.canModify) return;

        const minusBtn = this.element.querySelector('.counter-minus');
        const plusBtn = this.element.querySelector('.counter-plus');
        const display = this.element.querySelector('.counter-display');

        minusBtn?.addEventListener('click', () => this.changeFear(-1));
        plusBtn?.addEventListener('click', () => this.changeFear(1));
        display?.addEventListener('click', () => this.changeFear(1));
        display?.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.changeFear(-1);
        });
    }

    async changeFear(amount) {
        const currentValue = this.fearValue;
        const newValue = Math.max(0, Math.min(12, currentValue + amount));
        
        console.log(`Fear Tracker | Changing fear from ${currentValue} to ${newValue}`);
        
        try {
            if (ui.resources && typeof ui.resources.updateFear === 'function') {
                await ui.resources.updateFear(newValue);
            } else if (game.system?.api?.applications?.ui?.DhFearTracker) {
                const FearTracker = game.system.api.applications.ui.DhFearTracker;
                const tracker = new FearTracker();
                await tracker.updateFear(newValue);
            } else {
                await game.settings.set('daggerheart', 'ResourcesFear', newValue);
            }
            
            // Force update display immediately
            setTimeout(() => this.updateDisplay(), 100);
            
        } catch (error) {
            console.error('Fear Tracker | Error updating fear:', error);
            await game.settings.set('daggerheart', 'ResourcesFear', newValue);
            // Force update display even on error
            setTimeout(() => this.updateDisplay(), 100);
        }
    }

    updateDisplay() {
        if (!this.element) {
            console.log('Fear Tracker | updateDisplay: No element found');
            return;
        }
        
        const valueElement = this.element.querySelector('.counter-value');
        const newValue = this.fearValue;
        
        console.log('Fear Tracker | updateDisplay: Updating to', newValue);
        
        if (valueElement) {
            valueElement.textContent = newValue;
            console.log('Fear Tracker | Display updated successfully');
        } else {
            console.log('Fear Tracker | updateDisplay: No value element found');
        }
    }

    startPeriodicRefresh() {
        // Check for changes every 2 seconds as a backup
        this.refreshInterval = setInterval(() => {
            const currentValue = this.fearValue;
            if (currentValue !== this.lastKnownValue) {
                console.log(`Fear Tracker | Periodic check: value changed from ${this.lastKnownValue} to ${currentValue}`);
                this.lastKnownValue = currentValue;
                this.updateDisplay();
            }
        }, 2000);
    }

    dispose() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
        
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
}
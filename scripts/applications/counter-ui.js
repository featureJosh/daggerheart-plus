export class CounterUI {
    constructor() {
        this.element = null;
        this.lastKnownValue = 0;
    }

    async initialize() {
        console.log('DH+ Fear Tracker | Initializing...');
        
        Hooks.on('updateSetting', (setting) => {
            if (setting.key === 'ResourcesFear' && setting.namespace === 'daggerheart') {
                this.updateDisplay();
            }
        });
        
        if (game.socket) {
            console.log('DH+ Fear Tracker | Setting up socket listener for module.daggerheart-plus');
            game.socket.on('module.daggerheart-plus', (data) => {
                console.log('DH+ Fear Tracker | Received socket event:', data);
                if (data.action === 'fearChanged') {
                    console.log('DH+ Fear Tracker | Processing fear change:', data);
                    this.updateDisplay();
                    this.triggerChangeAnimation(data.increased);
                }
            });
            
            console.log('DH+ Fear Tracker | Testing socket by emitting test event');
            setTimeout(() => {
                game.socket.emit('module.daggerheart-plus', {
                    action: 'fearChanged',
                    value: 999,
                    increased: true
                });
                console.log('DH+ Fear Tracker | Test event emitted');
            }, 2000);
        } else {
            console.warn('DH+ Fear Tracker | No game.socket available');
        }
    }

    get fearValue() {
        try {
            return game.settings.get('daggerheart', 'ResourcesFear') || 0;
        } catch (error) {
            console.warn('DH+ Fear Tracker | Error getting fear value:', error);
            return 0;
        }
    }

    get maxFear() {
        try {
            return game.settings.get('daggerheart', 'Homebrew')?.maxFear || 12;
        } catch (error) {
            return 12;
        }
    }

    get canModify() {
        return game.user.isGM;
    }

    async render() {
        console.log('DH+ Fear Tracker | Rendering...');
        
        if (this.element) {
            console.log('DH+ Fear Tracker | Removing existing element');
            this.element.remove();
        }

        const hotbar = document.querySelector('#ui-bottom #hotbar') || document.querySelector('#hotbar');
        console.log('DH+ Fear Tracker | Hotbar found:', !!hotbar);
        
        if (!hotbar) {
            console.log('DH+ Fear Tracker | Hotbar not found, retrying in 1s');
            setTimeout(() => this.render(), 1000);
            return;
        }

        let container = document.querySelector('#counters-wrapper');
        if (!container) {
            container = document.createElement('div');
            container.id = 'counters-wrapper';
            container.className = 'counters-wrapper';
            hotbar.parentNode.insertBefore(container, hotbar);
        }
        
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
        
        console.log('DH+ Fear Tracker | Element created. Current fear value:', this.fearValue);
        console.log('DH+ Fear Tracker | Can modify:', this.canModify);
        
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
        console.log('DH+ Fear Tracker | changeFear called with amount:', amount);
        const currentValue = this.fearValue;
        const newValue = Math.max(0, Math.min(this.maxFear, currentValue + amount));
        
        console.log('DH+ Fear Tracker | Fear values:', { currentValue, newValue, maxFear: this.maxFear });
        
        if (currentValue === newValue) return;
        
        try {
            console.log('DH+ Fear Tracker | Forcing use of our emitAsGM method');
            await this.emitAsGM('DhGMUpdateFear', newValue);
        } catch (error) {
            console.error('DH+ Fear Tracker | Error updating fear:', error);
        }
    }

    async emitAsGM(eventName, update) {
        console.log('DH+ Fear Tracker | emitAsGM called:', { eventName, update, isGM: game.user.isGM });
        
        if (!game.user.isGM) {
            console.log('DH+ Fear Tracker | Non-GM, sending socket event');
            return await game.socket.emit('module.daggerheart-plus', {
                action: 'fearChanged',
                value: update,
                increased: update > this.lastKnownValue
            });
        } else {
            console.log('DH+ Fear Tracker | GM, updating setting and broadcasting');
            await game.settings.set('daggerheart', 'ResourcesFear', update);
            console.log('DH+ Fear Tracker | About to emit socket event');
            try {
                game.socket.emit('module.daggerheart-plus', {
                    action: 'fearChanged',
                    value: update,
                    increased: update > this.lastKnownValue
                });
                console.log('DH+ Fear Tracker | Socket event emitted successfully');
            } catch (error) {
                console.error('DH+ Fear Tracker | Error emitting socket event:', error);
            }
            return update;
        }
    }

    updateDisplay() {
        if (!this.element) {
            console.log('DH+ Fear Tracker | updateDisplay: No element found');
            return;
        }
        
        const valueElement = this.element.querySelector('.counter-value');
        const newValue = this.fearValue;
        const oldValue = this.lastKnownValue;
        
        console.log('DH+ Fear Tracker | updateDisplay: Updating to', newValue);
        
        if (valueElement) {
            valueElement.textContent = newValue;
            
            if (newValue !== oldValue) {
                this.triggerChangeAnimation(newValue > oldValue);
            }
            
            this.lastKnownValue = newValue;
            console.log('DH+ Fear Tracker | Display updated successfully');
        } else {
            console.warn('DH+ Fear Tracker | Value element not found, re-rendering');
            this.render();
        }
    }

    triggerChangeAnimation(isIncrease) {
        if (!this.element) return;
        
        const container = this.element;
        const valueElement = this.element.querySelector('.counter-value');
        
        container.classList.remove('fear-changed');
        valueElement.classList.remove('fear-value-flash');
        
        setTimeout(() => {
            container.classList.add('fear-changed');
            valueElement.classList.add('fear-value-flash');
            
            this.createParticleEffect(isIncrease);
            
            setTimeout(() => {
                container.classList.remove('fear-changed');
                valueElement.classList.remove('fear-value-flash');
            }, 800);
        }, 10);
    }

    createParticleEffect(isIncrease) {
        if (!this.element) return;
        
        const container = this.element;
        const rect = container.getBoundingClientRect();
        
        for (let i = 0; i < 3; i++) {
            const particle = document.createElement('div');
            particle.innerHTML = isIncrease ? '☠️' : '💨';
            particle.style.position = 'fixed';
            particle.style.left = `${rect.left + rect.width / 2}px`;
            particle.style.top = `${rect.top + rect.height / 2}px`;
            particle.style.fontSize = '1.2em';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '10001';
            particle.className = isIncrease ? 'skull-particle' : 'smoke-particle';
            
            const angle = (Math.PI * 2 / 3) * i + (isIncrease ? 0 : Math.PI);
            const distance = 60 + Math.random() * 40;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            
            particle.style.setProperty('--tx', `${tx}px`);
            particle.style.setProperty('--ty', `${ty}px`);
            
            document.body.appendChild(particle);
            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, isIncrease ? 2000 : 3000);
        }
    }

    dispose() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
        
        if (game.socket) {
            game.socket.off('module.daggerheart-plus');
        }
    }
}
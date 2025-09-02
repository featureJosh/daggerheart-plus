const MODULE_ID = 'daggerheart-plus';

export class TokenCounterUI {
    constructor() {
        this.element = null;
        this.selectedToken = null;
        this.hp = { current: 0, max: 0 };
        this.hope = { current: 0, max: 0 };
        this.stress = { current: 0, max: 0 };
        this.armorSlots = { current: 0, max: 0 };
        this.characterStress = { current: 0, max: 0 };
        this.actorType = null;

    }

    async initialize() {
        console.log('Token Counter UI | Initializing');
        
        Hooks.on('controlToken', (token, controlled) => {
            if (controlled && token.actor) {
                this.setSelectedToken(token);
            } else if (!controlled && canvas.tokens.controlled.length === 0) {
                this.hide();
            }
        });

        Hooks.on('updateActor', (actor, changes) => {
            if (this.selectedToken && this.selectedToken.actor.id === actor.id) {
                console.log('Token Counter | Actor updated, refreshing display');
                setTimeout(() => {
                    this.updateFromToken(this.selectedToken);
                    this.render();
                }, 50);
            }
        });

        Hooks.on('updateToken', (token, changes) => {
            if (this.selectedToken && this.selectedToken.id === token.id) {
                console.log('Token Counter | Token updated, refreshing display');
                setTimeout(() => {
                    this.updateFromToken(this.selectedToken);
                    this.render();
                }, 50);
            }
        });



        if (canvas.tokens.controlled.length > 0) {
            this.setSelectedToken(canvas.tokens.controlled[0]);
        }
    }

    setSelectedToken(token) {
        if (!token || !token.actor) {
            this.hide();
            return;
        }

        this.selectedToken = token;
        this.updateFromToken(token);
        this.show();
        this.render();
    }

    updateFromToken(token) {
        if (!token || !token.actor) return;

        const actor = token.actor;
        
        const system = actor.system;
        this.actorType = actor.type;

        this.hp = {
            current: system.resources.hitPoints.value,
            max: system.resources.hitPoints.max
        };

        if (this.actorType === 'character') {
            this.hope = {
                current: system.resources.hope.value,
                max: system.resources.hope.max
            };

            this.characterStress = {
                current: system.resources.stress.value,
                max: system.resources.stress.max
            };

            this.armorSlots = {
                current: system.resources.armor?.value ?? 0,
                max: system.resources.armor?.max ?? system.armorScore ?? 0
            };
            
            console.log('Token Counter | Armor data:', {
                armor: system.resources.armor,
                current: this.armorSlots.current,
                max: this.armorSlots.max,
                actorArmor: actor.armor,
                armorScore: system.armorScore
            });
        } else if (this.actorType === 'adversary' || this.actorType === 'companion') {
            this.stress = {
                current: system.resources.stress.value,
                max: system.resources.stress.max
            };
        }

        const rightContainer = document.querySelector('#token-counters-right');
        if (rightContainer) {
            this.createRightCounters(rightContainer);
        }
    }

    async render() {
        if (!this.selectedToken || !this.element) return;

        const container = this.element;
        container.innerHTML = '';

        if (this.canModify()) {
            const hpCounter = this.createCounter('hp', this.hp, 'HP');
            container.appendChild(hpCounter);

            if (this.actorType === 'character') {
                const hopeCounter = this.createCounter('hope', this.hope, 'Hope');
                container.appendChild(hopeCounter);
            }
        }

        const rightContainer = document.querySelector('#token-counters-right');
        if (rightContainer) {
            this.createRightCounters(rightContainer);
        }

        this.activateListeners();
    }

    createCounter(type, resource, label) {
        const counter = document.createElement('div');
        counter.id = `token-${type}-counter`;
        counter.className = 'faded-ui counter-ui token-counter';
        counter.innerHTML = `
            <button class="counter-minus ${type}-minus" data-type="${type}">
                <i class="fas fa-minus"></i>
            </button>
            <div class="counter-display">
                <div class="counter-value ${type}-value">${resource.current}/${resource.max}</div>
                <div class="counter-label">${label}</div>
            </div>
            <button class="counter-plus ${type}-plus" data-type="${type}">
                <i class="fas fa-plus"></i>
            </button>
        `;
        return counter;
    }

    activateListeners() {
        if (!this.element) return;

        const rightContainer = document.querySelector('#token-counters-right');
        const containers = [this.element, rightContainer].filter(Boolean);

        // Attach listeners for both left and right containers
        containers.forEach(container => {
            const buttons = container.querySelectorAll('.counter-minus, .counter-plus');
            buttons.forEach(button => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleButtonClick(e);
                });
            });

            const displays = container.querySelectorAll('.counter-display');
            displays.forEach(display => {
                display.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const counter = display.closest('.token-counter');
                    const type = counter.querySelector('[data-type]').dataset.type;
                    this.modifyResource(type, 1);
                });

                display.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const counter = display.closest('.token-counter');
                    const type = counter.querySelector('[data-type]').dataset.type;
                    this.modifyResource(type, -1);
                });
            });
        });
    }

    handleButtonClick(event) {
        const button = event.currentTarget;
        const type = button.dataset.type;
        const isIncrease = button.classList.contains('counter-plus');
        const amount = isIncrease ? 1 : -1;
        
        this.modifyResource(type, amount);
    }

    async modifyResource(type, amount) {
        if (!this.selectedToken || !this.canModify()) return;

        const actor = this.selectedToken.actor;
        let updatePath = '';
        let currentValue = 0;
        let maxValue = 0;

        switch (type) {
            case 'hp':
                updatePath = 'system.resources.hitPoints.value';
                currentValue = this.hp.current;
                maxValue = this.hp.max;
                break;
            case 'hope':
                updatePath = 'system.resources.hope.value';
                currentValue = this.hope.current;
                maxValue = this.hope.max;
                break;
            case 'stress':
                updatePath = 'system.resources.stress.value';
                currentValue = this.stress.current;
                maxValue = this.stress.max;
                break;
            case 'character-stress':
                updatePath = 'system.resources.stress.value';
                currentValue = this.characterStress.current;
                maxValue = this.characterStress.max;
                break;
            case 'armor-slots':
                updatePath = 'system.resources.armor.value';
                currentValue = this.armorSlots.current;
                maxValue = this.armorSlots.max;
                console.log('Token Counter | Modifying armor:', {
                    type,
                    currentValue,
                    maxValue,
                    amount,
                    updatePath
                });
                break;
            default:
                return;
        }

        const newValue = Math.max(0, Math.min(currentValue + amount, maxValue));
        
        if (newValue !== currentValue) {
            await actor.update({ [updatePath]: newValue });
        }
    }



    show() {
        if (!this.element) {
            this.createElement();
        }
        if (this.element) {
            this.element.style.display = 'flex';
        }
        
        const leftContainer = document.querySelector('#token-counters-left');
        const rightContainer = document.querySelector('#token-counters-right');
        
        if (leftContainer) {
            leftContainer.style.display = 'flex';
        }
        if (rightContainer) {
            rightContainer.style.display = 'flex';
        }
    }

    hide() {
        if (this.element) {
            this.element.style.display = 'none';
        }
        
        const leftContainer = document.querySelector('#token-counters-left');
        const rightContainer = document.querySelector('#token-counters-right');
        
        if (leftContainer) {
            leftContainer.style.display = 'none';
        }
        if (rightContainer) {
            rightContainer.style.display = 'none';
        }
        
        this.selectedToken = null;
    }

    createElement() {
        const hotbar = document.querySelector('#ui-bottom #hotbar');
        if (!hotbar) return;

        let wrapper = document.querySelector('#counters-wrapper');
        if (!wrapper) {
            wrapper = document.createElement('div');
            wrapper.id = 'counters-wrapper';
            wrapper.className = 'counters-wrapper';
            hotbar.parentNode.insertBefore(wrapper, hotbar);
        }

        let leftContainer = document.querySelector('#token-counters-left');
        if (!leftContainer) {
            leftContainer = document.createElement('div');
            leftContainer.id = 'token-counters-left';
            leftContainer.className = 'token-counters-left';
            leftContainer.style.display = 'none';
            wrapper.insertBefore(leftContainer, wrapper.firstChild);
        }

        let rightContainer = document.querySelector('#token-counters-right');
        if (!rightContainer) {
            rightContainer = document.createElement('div');
            rightContainer.id = 'token-counters-right';
            rightContainer.className = 'token-counters-right';
            rightContainer.style.display = 'none';
            wrapper.appendChild(rightContainer);
        }

        this.element = document.createElement('div');
        this.element.id = 'token-counters-container';
        this.element.className = 'token-counters-container';
        this.element.style.display = 'none';

        leftContainer.appendChild(this.element);
    }

    createRightCounters(rightContainer) {
        if (!this.selectedToken || !this.canModify()) {
            rightContainer.innerHTML = '';
            return;
        }

        rightContainer.innerHTML = '';

        if (this.actorType === 'character') {
            const characterStressCounter = this.createCounter('character-stress', this.characterStress, 'Stress');
            rightContainer.appendChild(characterStressCounter);

            const armorCounter = this.createCounter('armor-slots', this.armorSlots, 'Armor');
            rightContainer.appendChild(armorCounter);
        } else if (this.actorType === 'adversary' || this.actorType === 'companion') {
            const stressCounter = this.createCounter('stress', this.stress, 'Stress');
            rightContainer.appendChild(stressCounter);
        }
    }

    canModify() {
        if (!this.selectedToken) return false;
        
        const actor = this.selectedToken.actor;
        return game.user.isGM || game.user.hasRole('ASSISTANT') || actor.isOwner;
    }

    dispose() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }
}

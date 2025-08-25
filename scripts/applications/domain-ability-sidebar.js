import { buildItemCardChat } from '../utils.js';

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class DomainAbilitySidebar extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(actor) {
        super();
        this.actor = actor;
        this.previewElement = null;
        this.isPinned = false;
        this.previewTimer = null;
        
        this.slotTypes = [
            { key: 'domain', label: 'ITEM.TypeDomain' },
            { key: 'class', label: 'ITEM.TypeClass' },
            { key: 'subclass', label: 'ITEM.TypeSubclass' },
            { key: 'community', label: 'ITEM.TypeCommunity' },
            { key: 'ancestry', label: 'ITEM.TypeAncestry' }
        ];
    }

    static DEFAULT_OPTIONS = {
        id: 'domain-ability-sidebar',
        classes: ['daggerheart', 'dh-style', 'domain-ability-sidebar'],
        tag: 'div',
        window: {
            frame: false,
            positioned: false,
            resizable: false
        },
        position: {
            left: 20,
            top: 100,
            width: 150,
            height: 'auto'
        },
        actions: {
            postToChat: this.postToChat,
            editItem: this.editItem,
            deleteItem: this.deleteItem,
            moveToVault: this.moveToVault,
            updateTracker: this.updateTracker
        },
        dragDrop: [{
            dragSelector: '.domain-ability-button',
            dropSelector: '.domain-ability-slot'
        }]
    };

    static PARTS = {
        sidebar: {
            template: 'modules/daggerheart-plus/templates/ui/domainAbilitySidebar.hbs'
        }
    };

    async _prepareContext() {
        const context = await super._prepareContext();
        context.actor = this.actor;
        context.slotTypes = this.slotTypes;
        context.abilities = this._organizeAbilities();
        return context;
    }

    _organizeAbilities() {
        const organized = {};
        
        this.slotTypes.forEach(slotType => {
            organized[slotType.key] = {
                label: game.i18n.localize(slotType.label),
                items: []
            };
        });

        this.actor.items.forEach(item => {
            const location = item.system.location;
            if (location && organized[location]) {
                organized[location].items.push({
                    id: item.id,
                    name: item.name,
                    img: item.img,
                    type: item.type,
                    system: item.system,
                    hasTrackers: this._hasTrackers(item)
                });
            }
        });

        return organized;
    }

    _hasTrackers(item) {
        return item.system.uses?.max > 0 || item.system.resources?.length > 0;
    }

    _attachPartListeners(partId, htmlElement, options) {
        super._attachPartListeners(partId, htmlElement, options);
        
        htmlElement.addEventListener('mouseenter', this._onMouseEnter.bind(this), true);
        htmlElement.addEventListener('mouseleave', this._onMouseLeave.bind(this), true);
        htmlElement.addEventListener('click', this._onClick.bind(this), true);
        htmlElement.addEventListener('contextmenu', this._onRightClick.bind(this), true);
        
        htmlElement.addEventListener('dragover', this._onDragOver.bind(this));
        htmlElement.addEventListener('drop', this._onDrop.bind(this));
    }

    _onMouseEnter(event) {
        const button = event.target.closest('.domain-ability-button');
        if (!button) return;
        
        clearTimeout(this.previewTimer);
        this.previewTimer = setTimeout(() => {
            this._showPreview(button);
        }, 350);
    }

    _onMouseLeave(event) {
        const button = event.target.closest('.domain-ability-button');
        if (!button) return;
        
        clearTimeout(this.previewTimer);
        
        if (!this.isPinned) {
            this._hidePreview();
        }
    }

    _onClick(event) {
        const button = event.target.closest('.domain-ability-button');
        if (!button) return;
        
        if (event.button === 1) {
            this._togglePin();
            return;
        }
        
        if (event.button === 0) {
            this._postItemToChat(button);
        }
    }

    _onRightClick(event) {
        const tracker = event.target.closest('.tracker-bubble');
        if (tracker) {
            event.preventDefault();
            this._showTrackerMenu(tracker, event);
        }
    }

    async _showPreview(buttonElement) {
        const itemId = buttonElement.dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (!item) return;

        if (!this.previewElement) {
            this.previewElement = $('<div class="domain-ability-preview"></div>').appendTo('body');
        }

        const cardHtml = buildItemCardChat({
            itemId: item.id,
            actorId: this.actor.id,
            image: item.img,
            name: item.name,
            category: item.system.category || '',
            rarity: item.system.rarity || '',
            description: item.system.description || '',
            extraClasses: 'domain-preview-card',
            itemType: item.type,
            system: item.system
        });

        this.previewElement.html(cardHtml);
        
        const { left, top } = this._calculatePreviewPosition(buttonElement);
        this.previewElement.css({ left: left + 'px', top: top + 'px' }).addClass('show');
    }

    _calculatePreviewPosition(buttonElement) {
        const rect = buttonElement.getBoundingClientRect();
        const previewWidth = 260;
        const previewHeight = 400;
        
        let left = rect.right + 10;
        let top = rect.top;
        
        if (left + previewWidth > window.innerWidth) {
            left = rect.left - previewWidth - 10;
        }
        
        if (top + previewHeight > window.innerHeight) {
            top = window.innerHeight - previewHeight - 10;
        }
        
        return { left, top };
    }

    _hidePreview() {
        if (this.previewElement) {
            this.previewElement.removeClass('show');
        }
    }

    _togglePin() {
        this.isPinned = !this.isPinned;
        
        if (this.previewElement) {
            this.previewElement.toggleClass('pinned', this.isPinned);
            
            if (this.isPinned) {
                $(document).on('click.preview', (event) => {
                    if (!$(event.target).closest('.domain-ability-preview').length) {
                        this._unpin();
                    }
                });
            } else {
                $(document).off('click.preview');
            }
        }
    }

    _unpin() {
        this.isPinned = false;
        this.previewElement?.removeClass('pinned');
        $(document).off('click.preview');
        this._hidePreview();
    }

    async _postItemToChat(buttonElement) {
        const itemId = buttonElement.dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (!item) return;

        const cardHtml = buildItemCardChat({
            itemId: item.id,
            actorId: this.actor.id,
            image: item.img,
            name: item.name,
            category: item.system.category || '',
            rarity: item.system.rarity || '',
            description: item.system.description || '',
            extraClasses: 'domain-chat-card',
            itemType: item.type,
            system: item.system
        });

        await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            content: cardHtml,
            flags: {
                daggerheart: {
                    cssClass: 'dh-chat-message dh-style'
                }
            }
        });
    }

    static async postToChat(event, target) {
        const app = this;
        await app._postItemToChat(target.closest('.domain-ability-button'));
    }

    static async editItem(event, target) {
        const itemId = target.closest('[data-item-id]').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) item.sheet.render(true);
    }

    static async deleteItem(event, target) {
        const itemId = target.closest('[data-item-id]').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) await item.delete();
    }

    static async moveToVault(event, target) {
        const itemId = target.closest('[data-item-id]').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) {
            await item.update({ 'system.location': 'vault' });
        }
    }

    async _onDragOver(event) {
        event.preventDefault();
        const slot = event.target.closest('.domain-ability-slot');
        if (slot && slot.classList.contains('empty')) {
            slot.classList.add('drag-over');
        }
    }

    async _onDrop(event) {
        event.preventDefault();
        const slot = event.target.closest('.domain-ability-slot');
        if (!slot) return;

        slot.classList.remove('drag-over');
        
        const data = foundry.applications.ux.TextEditor.getDragEventData(event);
        const item = await fromUuid(data.uuid);
        
        if (item && item.actor?.id === this.actor.id) {
            const slotType = slot.dataset.slotType;
            await item.update({ 'system.location': slotType });
            this.render();
        }
    }
}

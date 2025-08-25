import { buildItemCardChat } from '../utils.js';

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class HeaderLoadoutBar extends HandlebarsApplicationMixin(ApplicationV2) {
    constructor(actor) {
        super();
        this.actor = actor;
        this.previewElement = null;
        this.isPinned = false;
        this.previewTimer = null;
    }

    static DEFAULT_OPTIONS = {
        id: 'header-loadout-bar',
        classes: ['daggerheart', 'dh-style', 'header-loadout-bar'],
        tag: 'div',
        window: {
            frame: false,
            positioned: false,
            resizable: false
        },
        position: {
            left: 200,
            top: 20,
            width: 600,
            height: 120
        },
        actions: {
            postToChat: this.postToChat,
            editItem: this.editItem,
            deleteItem: this.deleteItem
        },
        dragDrop: [{
            dragSelector: '.loadout-card',
            dropSelector: '.loadout-card-slot'
        }]
    };

    static PARTS = {
        bar: {
            template: 'modules/daggerheart-plus/templates/ui/headerLoadoutBar.hbs'
        }
    };

    async _prepareContext() {
        const context = await super._prepareContext();
        context.actor = this.actor;
        context.loadoutItems = this._getLoadoutItems();
        return context;
    }

    _getLoadoutItems() {
        const loadoutTypes = ['class', 'subclass', 'ancestry', 'community'];
        const items = {};
        
        loadoutTypes.forEach(type => {
            const item = this.actor.items.find(i => i.system.location === type);
            items[type] = item || null;
        });
        
        return items;
    }

    _attachPartListeners(partId, htmlElement, options) {
        super._attachPartListeners(partId, htmlElement, options);
        
        htmlElement.addEventListener('mouseenter', this._onMouseEnter.bind(this), true);
        htmlElement.addEventListener('mouseleave', this._onMouseLeave.bind(this), true);
        htmlElement.addEventListener('click', this._onClick.bind(this), true);
    }

    _onMouseEnter(event) {
        const card = event.target.closest('.loadout-card');
        if (!card) return;
        
        clearTimeout(this.previewTimer);
        this.previewTimer = setTimeout(() => {
            this._showPreview(card);
        }, 350);
    }

    _onMouseLeave(event) {
        clearTimeout(this.previewTimer);
        if (!this.isPinned) {
            this._hidePreview();
        }
    }

    _onClick(event) {
        const card = event.target.closest('.loadout-card');
        if (!card) return;
        
        if (event.button === 1) {
            this._togglePin();
            return;
        }
        
        if (event.button === 0) {
            this._postItemToChat(card);
        }
    }

    async _showPreview(cardElement) {
        const itemId = cardElement.dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (!item) return;

        if (!this.previewElement) {
            this.previewElement = $('<div class="header-loadout-preview"></div>').appendTo('body');
        }

        const cardHtml = buildItemCardChat({
            itemId: item.id,
            actorId: this.actor.id,
            image: item.img,
            name: item.name,
            category: item.system.category || '',
            rarity: item.system.rarity || '',
            description: item.system.description || '',
            extraClasses: 'loadout-preview-card',
            itemType: item.type,
            system: item.system
        });

        this.previewElement.html(cardHtml);
        
        const { left, top } = this._calculatePreviewPosition(cardElement);
        this.previewElement.css({ left: left + 'px', top: top + 'px' }).addClass('show');
    }

    _calculatePreviewPosition(cardElement) {
        const rect = cardElement.getBoundingClientRect();
        const previewWidth = 260;
        const previewHeight = 400;
        
        let left = rect.left + (rect.width / 2) - (previewWidth / 2);
        let top = rect.bottom + 10;
        
        if (left < 10) left = 10;
        if (left + previewWidth > window.innerWidth - 10) {
            left = window.innerWidth - previewWidth - 10;
        }
        
        if (top + previewHeight > window.innerHeight - 10) {
            top = rect.top - previewHeight - 10;
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
                $(document).on('click.headerPreview', (event) => {
                    if (!$(event.target).closest('.header-loadout-preview').length) {
                        this._unpin();
                    }
                });
            } else {
                $(document).off('click.headerPreview');
            }
        }
    }

    _unpin() {
        this.isPinned = false;
        this.previewElement?.removeClass('pinned');
        $(document).off('click.headerPreview');
        this._hidePreview();
    }

    async _postItemToChat(cardElement) {
        const itemId = cardElement.dataset.itemId;
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
            extraClasses: 'loadout-chat-card',
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
        await app._postItemToChat(target.closest('.loadout-card'));
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
}

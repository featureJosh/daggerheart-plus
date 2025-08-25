export const buildItemCardChat = ({
    itemId,
    actorId,
    image,
    name,
    category = '',
    rarity = '',
    description = '',
    extraClasses = '',
    itemType,
    system
}) => {
    const badges = [];
    
    if (itemType === 'weapon') {
        if (system.damage?.total) badges.push(`${system.damage.total} damage`);
        if (system.range) badges.push(`${system.range} range`);
    }
    
    if (itemType === 'armor') {
        if (system.armor?.value) badges.push(`${system.armor.value} armor`);
        if (system.burden) badges.push(`${system.burden} burden`);
    }
    
    const categoryDisplay = category ? `<span class="item-category">${category}</span>` : '';
    const rarityDisplay = rarity ? `<span class="item-rarity rarity-${rarity.toLowerCase()}">${rarity}</span>` : '';
    const badgesDisplay = badges.length ? `<div class="item-badges">${badges.map(b => `<span class="badge">${b}</span>`).join('')}</div>` : '';
    
    return `
        <div class="item-card-chat ${extraClasses}" data-item-id="${itemId}" data-actor-id="${actorId}">
            <div class="card-image-container">
                <img src="${image}" alt="${name}" class="card-image">
            </div>
            <div class="card-content">
                <div class="card-header">
                    <h3 class="card-title">${name}</h3>
                    <div class="card-meta">
                        ${categoryDisplay}
                        ${rarityDisplay}
                    </div>
                </div>
                ${badgesDisplay}
                ${description ? `<div class="card-description">${description}</div>` : ''}
            </div>
        </div>
    `;
};

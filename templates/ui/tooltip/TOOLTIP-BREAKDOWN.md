# Daggerheart Tooltip System - HBS Template Breakdown

This document provides a full breakdown of all tooltip Handlebars (`.hbs`) templates used in the Daggerheart system.

---

## Overview

The tooltip system is managed by `DhTooltipManager` (`module/documents/tooltipManager.mjs`) which extends Foundry's built-in `TooltipManager`. Tooltips are triggered via `data-tooltip` attributes on HTML elements with special prefixes like `#item#`, `#attack#`, `#battlepoints#`, etc.

### Common Structure

Most tooltips follow a similar structure:
- **Container**: `<div class="daggerheart dh-style tooltip [card-style]">`
- **Image**: `<img class="tooltip-image">` 
- **Title**: `<h2 class="tooltip-title">`
- **Tags**: `<div class="tags">` with individual `<div class="tag">` elements
- **Description**: `<div class="tooltip-description">`
- **Hint**: `<p class="tooltip-hint">` with middle-click instruction

---

## Main Tooltip Templates

### `action.hbs`
**Purpose**: Displays action/ability item tooltips.

**Context Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `item` | Object | The action item |
| `item.img` | String | Action image path |
| `item.name` | String | Action name |
| `item.uses` | Object | Uses data (value, max, recovery) |
| `item.cost` | Array | Cost objects (type, value, scalable, step) |
| `item.range` | String | Range key |
| `item.target` | Object | Target type and amount |
| `description` | String | Enriched HTML description |
| `config` | Object | CONFIG.DH reference |

**Features Displayed**:
- Uses (current/max/recovery type)
- Cost (type, value, scalable status, step)
- Range
- Target (type and amount)
- Description
- Middle-click hint

---

### `advantage.hbs`
**Purpose**: Displays advantage/disadvantage sources on actors.

**Context Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `sources` | Array | HTML strings for each source |

**Structure**: Simple list of source divs with raw HTML content.

---

### `adversary.hbs`
**Purpose**: Displays adversary actor tooltips with full stats.

**Context Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `item` | Object | The adversary actor |
| `item.system.tier` | String | Adversary tier key |
| `item.system.type` | String | Adversary type key |
| `item.system.difficulty` | Number | Difficulty rating |
| `item.system.resources` | Object | HP and stress data |
| `item.system.damageThresholds` | Object | Major/severe thresholds |
| `item.system.attack` | Object | Attack roll/damage data |
| `item.system.experiences` | Array | Experience modifiers |
| `item.system.motivesAndTactics` | String | Description text |
| `description` | String | Enriched description |
| `config` | Object | CONFIG.DH reference |
| `adversaryTypes` | Object | Adversary type lookup |

**Layout Sections**:
- Header with name/image/description
- Triple-column: Tier, Type, Difficulty
- Stats row: HP, Stress, Major, Severe, Attack, Damage
- Experiences list
- Motives and Tactics

---

### `armor.hbs`
**Purpose**: Displays armor item tooltips.

**Context Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `item` | Object | The armor item |
| `item.system.baseScore` | Number | Base armor score |
| `item.system.baseThresholds.major` | Number | Major damage threshold |
| `item.system.baseThresholds.severe` | Number | Severe damage threshold |
| `description` | String | Enriched description |

**Tags Displayed**: Base Score, Major Threshold, Severe Threshold

---

### `attack.hbs`
**Purpose**: Displays attack information for adversaries.

**Context Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `attack` | Object | Attack data object |
| `attack.img` | String | Attack image |
| `attack.name` | String | Attack name |
| `attack.roll.trait` | String | Associated trait key |
| `attack.range` | String | Range key |
| `attack.damage.parts` | Array | Damage formula parts |
| `description` | String | Enriched description |
| `parent` | Object | Parent actor |
| `config` | Object | CONFIG.DH reference |

**Tags Displayed**: Trait, Range, Damage formula with damage type symbols

---

### `battlepoints.hbs`
**Purpose**: Displays encounter battlepoint calculator with toggleable modifiers.

**Context Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `combatId` | String | Combat document ID |
| `currentBP` | Number | Current battlepoint total |
| `maxBP` | Number | Maximum battlepoints |
| `categories` | Object | Adversary type cost brackets with counts |
| `toggles` | Array | BP modifier toggle data |

**Features**:
- Header showing current/max BP
- Categories grouped by BP cost with adversary counts
- Toggleable modifiers with checkboxes
- Lock icons for automatic (non-toggleable) modifiers

**Interactive**: Checkboxes trigger `toggleModifier()` in the tooltip manager.

---

### `beastform.hbs`
**Purpose**: Displays beastform item tooltips for Druids.

**Context Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `item` | Object | The beastform item |
| `item.system.examples` | String | Example creatures |
| `item.system.beastformAttackData` | Object | Combat stats |
| `item.system.advantageOn` | Array | Advantage conditions |
| `item.system.features` | Array | Beastform features |
| `description` | String | Enriched description |

**Sections**:
- Examples subtitle
- Attack data: Main trait, Trait bonus, Evasion, Damage
- Advantage chips list
- Features via `tooltipTags.hbs` partial

---

### `consumable.hbs`
**Purpose**: Displays consumable item tooltips.

**Context Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `item` | Object | The consumable item |
| `item.system.quantity` | Number | Current quantity |
| `description` | String | Enriched description |

**Tags Displayed**: Quantity

---

### `death-move.hbs`
**Purpose**: Displays death move information.

**Context Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `move.img` | String | Move image |
| `move.name` | String | Move name |
| `move.description` | String | Move description (localized) |

**Structure**: Simple title container with image, name, and description.

---

### `domainCard.hbs`
**Purpose**: Displays domain card item tooltips.

**Context Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `item` | Object | The domain card item |
| `item.system.recallCost` | Number | Recall cost value |
| `item.system.domain` | String | Domain key |
| `item.system.type` | String | Card type key |
| `item.system.level` | Number | Card level |
| `description` | String | Enriched description |
| `config` | Object | CONFIG.DH reference |

**Features**:
- Icon bar with recall cost and domain icon
- Card type and level tags
- Description

---

### `downtime.hbs`
**Purpose**: Displays rest move information (short/long rest activities).

**Context Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `move.img` | String | Move image |
| `move.name` | String | Move name |
| `move.description` | String | Move description |

**Structure**: Same as `death-move.hbs` - title container with image, name, description.

---

### `effect.hbs`
**Purpose**: Displays active effect tooltips.

**Context Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `item` | Object | The active effect |
| `description` | String | Enriched description |

**Structure**: Minimal - image, title, description only.

---

### `effect-display.hbs`
**Purpose**: Displays effect information in the effects display UI.

**Context Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `effect.name` | String | Effect name (localized) |
| `effect.appliedBy` | String | Source that applied the effect |
| `effect.description` | String | Effect description |
| `effect.parent.system.description` | String | Fallback description |
| `effect.isLockedCondition` | Boolean | If true, cannot be removed |

**Features**:
- Header with name and "applied by" subtitle
- Description (from effect or parent)
- Conditional remove hint (hidden for locked conditions)

---

### `feature.hbs`
**Purpose**: Displays feature item tooltips.

**Context Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `item` | Object | The feature item |
| `description` | String | Enriched description |

**Tags Displayed**: "Feature" type label

---

### `loot.hbs`
**Purpose**: Displays loot item tooltips with associated actions.

**Context Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `item` | Object | The loot item |
| `item.system.actions` | Array | Associated actions |
| `description` | String | Enriched description |

**Features**:
- Basic item display
- Actions list via `tooltipTags.hbs` partial

---

### `weapon.hbs`
**Purpose**: Displays weapon item tooltips.

**Context Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `item` | Object | The weapon item |
| `item.system.secondary` | Boolean | Is secondary weapon |
| `item.system.burden` | String | Burden key |
| `item.system.attack.roll.trait` | String | Attack trait key |
| `item.system.attack.range` | String | Range key |
| `item.system.attack.damage.parts` | Array | Damage parts |
| `description` | String | Enriched description |
| `config` | Object | CONFIG.DH reference |

**Tags Displayed**:
- Primary/Secondary weapon
- Burden level
- Attack trait
- Range
- Damage formula with damage type symbols

---

## Partial Templates (`parts/`)

### `tooltipChips.hbs`
**Purpose**: Renders a list of small chip/badge elements.

**Context Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `label` | String | Section label (localized) |
| `chips` | Array | Chip values (strings or objects with `value`) |

**Output**: Title + chip container with individual chip divs.

---

### `tooltipTags.hbs`
**Purpose**: Renders a list of tagged features/actions with images and descriptions.

**Context Variables**:
| Variable | Type | Description |
|----------|------|-------------|
| `label` | String | Section label |
| `features` | Array | Feature/action items |
| `isAction` | Boolean | If true, treats items as actions |

**Structure**:
- Conditional title (only if features exist)
- Tag list with image, label, and enriched description for each

---

## Trigger Prefixes

The tooltip manager uses these prefixes in `data-tooltip` attributes:

| Prefix | Template | Description |
|--------|----------|-------------|
| `#item#<uuid>` | Dynamic by type | Item tooltip based on item type |
| `#attack#<uuid>` | `attack.hbs` | Adversary attack tooltip |
| `#battlepoints#` | `battlepoints.hbs` | BP calculator tooltip |
| `#effect-display#` | `effect-display.hbs` | Effect display tooltip |
| `#shortRest#<key>` | `downtime.hbs` | Short rest move tooltip |
| `#longRest#<key>` | `downtime.hbs` | Long rest move tooltip |
| `#advantage#<uuid>` | `advantage.hbs` | Advantage sources tooltip |
| `#disadvantage#<uuid>` | `advantage.hbs` | Disadvantage sources tooltip |
| `#deathMove#` | `death-move.hbs` | Death move tooltip |

---

## Common Handlebars Helpers Used

| Helper | Purpose |
|--------|---------|
| `localize` | Localizes strings via i18n |
| `lookup` | Retrieves values from objects by key |
| `formulaValue` | Evaluates formula strings |
| `damageFormula` | Renders damage formula |
| `damageSymbols` | Renders damage type icons |
| `numberFormat` | Formats numbers with options |
| `checked` | Returns "checked" attribute if true |
| `ifThen` | Conditional value selection |
| `concat` | String concatenation |
| `gt` | Greater than comparison |
| `or` | Logical OR |
| `and` | Logical AND |

---

## CSS Classes Reference

| Class | Purpose |
|-------|---------|
| `.daggerheart` | System namespace |
| `.dh-style` | System styling |
| `.tooltip` | Base tooltip class |
| `.card-style` | Card-like tooltip styling |
| `.tooltip-image` | Tooltip image |
| `.tooltip-title` | Main title |
| `.tooltip-subtitle` | Secondary title |
| `.tooltip-description` | Description block |
| `.tooltip-hint` | Interaction hint |
| `.tooltip-information-section` | Stats section container |
| `.tooltip-information` | Individual stat display |
| `.tags` | Tag container |
| `.tag` | Individual tag |
| `.tooltip-chips` | Chips container |
| `.tooltip-chip` | Individual chip |
| `.tooltip-tags` | Tags list container |
| `.tooltip-tag` | Individual tag with description |
| `.wide` | Wide tooltip modifier |
| `.bordered-tooltip` | Bordered tooltip modifier |


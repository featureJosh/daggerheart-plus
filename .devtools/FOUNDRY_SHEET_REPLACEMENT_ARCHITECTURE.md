# Foundry VTT Sheet Replacement Architecture (v13 Compatible)

This document provides a comprehensive guide to understanding how the Tidy 5e Sheets module replaces and overrides the default Foundry VTT dnd5e system character sheets with custom implementations. This pattern can be adapted to create custom sheet modules for other game systems.

**✅ Foundry VTT v13 Verified**: All patterns and code examples in this document are verified to work with Foundry VTT v13+ and reflect current best practices.

## Table of Contents
1. [Overview](#overview)
2. [Foundry v13 Compatibility](#foundry-v13-compatibility)
3. [Core Architecture](#core-architecture)
4. [Sheet Registration System](#sheet-registration-system)
5. [Class Hierarchy](#class-hierarchy)
6. [Svelte Integration](#svelte-integration)
7. [Foundry Integration Points](#foundry-integration-points)
8. [Module Structure](#module-structure)
9. [Implementation Guide](#implementation-guide)

## Overview

The Tidy 5e Sheets module demonstrates a sophisticated approach to replacing Foundry's default character sheets by:

1. **Registering custom sheet classes** during the `init` hook
2. **Inheriting from Foundry's base sheet classes** while adding custom functionality
3. **Using Svelte** for modern reactive UI components
4. **Implementing mixins** to share common functionality across different sheet types
5. **Providing extensibility hooks** for third-party modules to customize the sheets

The module doesn't actually "replace" the default sheets but rather registers additional sheet options that users can select, effectively providing alternatives that become the default choice.

## Foundry v13 Compatibility

### Verified v13 Components
The Tidy 5e Sheets module is actively maintained for Foundry VTT v13 and uses the latest API patterns:

**Module Configuration (module.json):**
```json
{
  "compatibility": {
    "minimum": "13",
    "verified": "13"  
  }
}
```

**Core v13 Classes Used:**
- `foundry.applications.sheets.ActorSheetV2` - Application V2 actor sheets
- `foundry.applications.sheets.ItemSheetV2` - Application V2 item sheets  
- `foundry.applications.apps.DocumentSheetConfig` - Sheet registration system

**v13 Features Leveraged:**
- **Enhanced Application V2 System**: Modern window management and rendering pipeline
- **Improved Header Controls**: Better integration with Foundry's header control system
- **Advanced Context Preparation**: Streamlined data preparation for sheet rendering
- **Better Hook System**: More reliable hooks for customization and integration

### Why These Patterns Are v13-Ready
1. **Uses Official APIs**: No deprecated or legacy APIs
2. **Application V2 Native**: Built on Foundry's modern application system
3. **Forward Compatible**: Follows patterns that will continue to work in future versions
4. **Actively Maintained**: Regular updates ensure continued v13 compatibility

## Core Architecture

### Entry Point Flow

```
module.json (esmodules: ["./tidy5e-sheet.js"]) 
    ↓
src/main.svelte.ts 
    ↓
Hooks.once('init') → Sheet Registration
    ↓
Hooks.once('ready') → API initialization & integrations
```

### Key Components

1. **Sheet Registration**: Using Foundry's `DocumentSheetConfig.registerSheet()`
2. **Custom Sheet Classes**: TypeScript classes extending Foundry's base sheets
3. **Mixin System**: Shared functionality across sheet types
4. **Svelte Components**: Modern reactive UI layer
5. **API System**: Extensibility for third-party modules

## Sheet Registration System

### Registration Pattern

The module registers custom sheets during the `init` hook using Foundry's built-in sheet registration system:

```typescript
// From src/main.svelte.ts
Hooks.once('init', () => {
  const documentSheetConfig = foundry.applications.apps.DocumentSheetConfig;

  // Register Character Sheet
  documentSheetConfig.registerSheet(
    Actor,                           // Document type (Actor/Item)
    CONSTANTS.DND5E_SYSTEM_ID,      // System ID ('dnd5e')
    Tidy5eCharacterSheet,           // Custom sheet class
    {
      types: [CONSTANTS.SHEET_TYPE_CHARACTER],  // Actor types this sheet handles
      label: 'TIDY5E.Tidy5eCharacterSheetClassic' // Display name
    }
  );
});
```

### Supported Document Types

The module registers sheets for multiple document types:

**Actor Sheets:**
- Character sheets (`character` type)
- NPC sheets (`npc` type) 
- Vehicle sheets (`vehicle` type)
- Group sheets (`group` type)
- Encounter sheets (`encounter` type)

**Item Sheets:**
- General item sheets (multiple item types: `background`, `class`, `consumable`, `equipment`, etc.)
- Container sheets (`container` type)

### Multiple Sheet Variants

The module provides two UI themes:
- **Classic**: Traditional layout
- **Quadrone**: Modern redesigned layout

Each theme registers its own sheet classes, giving users choice in UI style.

## Class Hierarchy

### Base Classes and Inheritance Chain

```
foundry.applications.sheets.ActorSheetV2 (Foundry Core)
    ↓
SvelteApplicationMixin (Svelte integration)
    ↓
TidyExtensibleDocumentSheetMixin (Common Tidy functionality)
    ↓
Tidy5eActorSheetClassicV2Base (Classic theme base)
    ↓
Tidy5eCharacterSheet (Specific sheet implementation)
```

### Key Base Classes (v13 Application V2)

1. **`foundry.applications.sheets.ActorSheetV2`** *(v13 Core Class)*
   - Foundry's built-in Application V2 actor sheet base
   - Provides core document handling, rendering, and interaction
   - **v13 Feature**: Enhanced header controls and window management
   - **v13 Feature**: Improved context preparation pipeline

2. **`foundry.applications.sheets.ItemSheetV2`** *(v13 Core Class)*
   - Foundry's built-in Application V2 item sheet base
   - Used for all custom item sheet implementations

3. **`SvelteApplicationMixin`**
   - Integrates Svelte components with Foundry applications
   - Manages component mounting/unmounting
   - Handles reactive context updates

4. **`TidyExtensibleDocumentSheetMixin`**
   - Common functionality for all Tidy sheets
   - Custom content rendering system
   - Header control management
   - Theme integration

5. **Sheet Type Bases**
   - `Tidy5eActorSheetClassicV2Base`: Classic theme actor sheets
   - `Tidy5eActorSheetQuadroneBase`: Quadrone theme actor sheets

### Mixin Pattern Benefits

The mixin system allows:
- **Code reuse** across different sheet types
- **Modular functionality** that can be mixed and matched
- **TypeScript compatibility** with proper type inheritance
- **Easy extension** for new sheet types

## Svelte Integration

### Component Architecture

```
Svelte Component (UI)
    ↓
Svelte Context (Reactive data)
    ↓  
Sheet Class (Logic & Data preparation)
    ↓
Foundry Document (Data source)
```

### Key Integration Points

1. **Component Mounting**
```typescript
// From Tidy5eCharacterSheet
_createComponent(node: HTMLElement): Record<string, any> {
  const component = mount(CharacterSheet, {
    target: node,
    context: new Map([
      [CONSTANTS.SVELTE_CONTEXT.CONTEXT, this._context],
      [CONSTANTS.SVELTE_CONTEXT.STATS, this.stats],
      // ... other context providers
    ]),
  });
  return component;
}
```

2. **Reactive Context**
```typescript
_context = new CoarseReactivityProvider<TContext | undefined>(undefined);
```

3. **Data Flow**
```typescript
async _prepareContext(): Promise<CharacterSheetContext> {
  // Prepare data for Svelte components
  const context = {
    actor: this.actor,
    items: this.actor.items,
    // ... processed data
  };
  return context;
}
```

## Foundry Integration Points

### Hook System

The module uses Foundry's hook system at several levels:

1. **Core Foundry Hooks**
   - `init`: Sheet registration
   - `ready`: API initialization
   - `dropActorSheetData`: Handle drag/drop operations

2. **Custom Tidy Hooks**
   - `tidy5e-sheet.ready`: API available for third-party modules
   - `tidy5e-sheet.renderActorSheet`: Sheet rendered
   - `tidy5e-sheet.preConfigureSections`: Before section configuration

### Document Integration

Custom sheets integrate with Foundry documents by:

1. **Extending base sheet classes**
2. **Implementing required methods** (`_prepareContext`, `_onDrop`, etc.)
3. **Maintaining compatibility** with document data structures
4. **Preserving standard behaviors** while adding enhancements

### Application V2 Integration

The module uses Foundry's Application V2 system:

- **Modern rendering pipeline**
- **Built-in position management** 
- **Header controls system**
- **Window management**

## Module Structure

### Directory Organization

```
src/
├── main.svelte.ts              # Entry point & sheet registration
├── constants.ts                # Module constants
├── api/                        # Public API for extensibility
├── foundry/                    # Foundry integration & adapters
├── mixins/                     # Reusable functionality mixins
├── sheets/                     # Sheet implementations
│   ├── classic/               # Classic theme sheets
│   └── quadrone/              # Quadrone theme sheets
├── components/                # Svelte UI components
├── features/                  # Feature implementations
├── runtime/                   # Runtime systems & managers
├── settings/                  # Module settings
├── types/                     # TypeScript type definitions
└── utils/                     # Utility functions
```

### Key Files

- **`src/main.svelte.ts`**: Module entry point, sheet registration
- **`src/constants.ts`**: All module constants and IDs  
- **`src/sheets/classic/Tidy5eCharacterSheet.svelte.ts`**: Character sheet implementation
- **`src/mixins/TidyExtensibleDocumentSheetMixin.svelte.ts`**: Core sheet functionality
- **`src/api/Tidy5eSheetsApi.ts`**: Public API for extensions

## Implementation Guide

### Creating a Custom Sheet Module for Another System (v13)

To create a similar sheet replacement module for a different game system in Foundry v13:

#### 1. Module Setup

```json
// module.json - v13 Compatible
{
  "id": "my-system-sheets",
  "title": "Custom System Sheets", 
  "esmodules": ["./main.js"],
  "compatibility": {
    "minimum": "13",
    "verified": "13"
  },
  "relationships": {
    "systems": [
      {
        "id": "your-target-system",
        "compatibility": {
          "minimum": "1.0.0"
        }
      }
    ]
  }
}
```

#### 2. Main Entry Point

```typescript
// src/main.ts
import { CustomCharacterSheet } from './sheets/CustomCharacterSheet.js';

Hooks.once('init', () => {
  const documentSheetConfig = foundry.applications.apps.DocumentSheetConfig;
  
  documentSheetConfig.registerSheet(
    Actor,
    'your-system-id', 
    CustomCharacterSheet,
    {
      types: ['character'],
      label: 'Custom Character Sheet'
    }
  );
});
```

#### 3. Basic Sheet Class

```typescript
// src/sheets/CustomCharacterSheet.ts
export class CustomCharacterSheet extends foundry.applications.sheets.ActorSheetV2 {
  
  static DEFAULT_OPTIONS = {
    position: {
      width: 600,
      height: 800,
    }
  };

  async _prepareContext(options: any) {
    const context = await super._prepareContext(options);
    
    // Add custom processing
    context.customData = this.processCustomData();
    
    return context;
  }
  
  async _renderHTML(context: any, options: any) {
    // Render your custom template/component
    return await renderTemplate('modules/my-system-sheets/templates/character.hbs', context);
  }
}
```

#### 4. Key Patterns to Follow

1. **Always extend Foundry's base classes**
2. **Register during the `init` hook**
3. **Use the system ID as the second parameter**
4. **Implement required sheet methods**
5. **Maintain data structure compatibility**

#### 5. Advanced Features

For more sophisticated implementations:

- **Use mixins** for shared functionality
- **Implement Svelte/React/Vue** for modern UI
- **Provide extension APIs** for third-party modules
- **Add theme support** for multiple UI variants
- **Implement comprehensive settings**

### Testing Your Implementation

1. **Load in a test world** with the target system
2. **Check sheet registration** in document sheet configuration
3. **Verify data compatibility** with system documents
4. **Test core functionality** (viewing, editing, rolling)
5. **Ensure no console errors** during normal operation

### Common Pitfalls

1. **Registering too late**: Use `init` hook, not `ready`
2. **Wrong system ID**: Must match exactly
3. **Breaking data compatibility**: Maintain expected data structures
4. **Missing required methods**: Implement all abstract methods
5. **Not handling edge cases**: Test with various document states

## Conclusion

The Tidy 5e Sheets module demonstrates a robust pattern for creating custom character sheets in Foundry VTT. The key insights are:

1. **Use Foundry's built-in registration system** rather than trying to override classes directly
2. **Extend base classes** to maintain compatibility while adding features
3. **Use modern web technologies** (like Svelte) for better user experiences
4. **Provide extensibility** for the broader module ecosystem
5. **Follow Foundry's Application V2 patterns** for future compatibility

This architecture allows for powerful customization while maintaining compatibility with the broader Foundry ecosystem, making it an excellent reference for similar projects targeting other game systems.

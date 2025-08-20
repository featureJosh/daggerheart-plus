# Daggerheart Plus Module

A Foundry VTT module that replaces the default Daggerheart system character sheets with enhanced versions.

## Module Structure

```
.daggerheart-plus/
├── module.json          # Module manifest
├── scripts/
│   ├── main.js         # Entry point & sheet registration
│   └── sheets/         # Custom sheet implementations
│       ├── base-sheet.js
│       ├── character-sheet.js
│       ├── adversary-sheet.js
│       ├── companion-sheet.js
│       └── environment-sheet.js
├── styles/
│   └── daggerheart-plus.css  # Override styles
├── templates/          # Handlebars templates
│   ├── character/
│   ├── adversary/
│   ├── companion/
│   └── environment/
└── lang/
    └── en.json        # Localization strings
```

## Key Features

1. **Sheet Registration**: Uses Foundry's `DocumentSheetConfig.registerSheet()` during the `init` hook to register custom sheets for all Daggerheart actor types.

2. **Base Sheet Class**: All sheets extend from `DaggerheartPlusBaseSheet` which provides common functionality.

3. **CSS Override**: Hides default Daggerheart sheets when our sheets are active and provides custom styling.

4. **Template System**: Uses Handlebars templates organized by actor type with proper tab support.

5. **Localization**: Full support for translation with English language file included.

## Installation

1. Place the `.daggerheart-plus` folder in your Foundry VTT modules directory
2. Activate the module in your world
3. The enhanced sheets will automatically replace the default ones

## Development Notes

- The module is designed to be non-invasive and only replaces sheet rendering
- All data structures remain compatible with the base Daggerheart system
- The CSS uses high specificity to ensure proper style override
- Templates are structured to match Foundry's Application V2 pattern

## Future Enhancements

- Integration with Daggerheart dice rolling system
- Advanced character creation workflow
- Enhanced item management
- Custom theme support
- API for third-party extensions

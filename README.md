# Nopalito Importer for Obsidian

Note: this was 100% vibe-coded.

An Obsidian plugin to import and convert Day One journal exports to Markdown files.

## Features

- 📝 **Complete Journal Import** - Import all Day One entries with full metadata
- 📊 **Frontmatter Support** - Dates, locations, weather, tags, and custom metadata
- 📸 **Media Handling** - Automatically imports photos, audio, and videos
- ⚙️ **Customizable** - Configure import folder, filename format, and metadata options
- 🔒 **Privacy First** - All processing happens locally in Obsidian
- 🎯 **Clean Output** - Beautiful, readable markdown files

## Installation

### Easy Install (Recommended)

1. Clone or download this repository.
2. Open a terminal in the project folder.
3. Run the installation script:

```bash
npm install
npm run build
npm run install-plugin
```

The script will ask for your Obsidian vault's plugin directory (e.g., `/Users/you/Vault/.obsidian/plugins/nopalito-importer`) and copy the necessary files for you.

### Manual Install

1. Download the latest release.
2. Create a folder named `nopalito-importer` in your vault's `.obsidian/plugins/` directory.
3. Copy `main.js` and `manifest.json` into that folder.
4. Reload Obsidian.
5. Enable "Nopalito Importer" in Settings → Community Plugins.

## Usage

1. **Export from Day One**
   - In Day One: File → Export → JSON
   - **Important:** Keep the `photos`, `audio`, and `video` folders in the same directory as your JSON file.

2. **Import to Obsidian**
   - Click the "Import Day One Journal (Nopalito)" icon in the ribbon (🌱).
   - Select your `Journal.json` file from the export folder.
   - The plugin will import entries and copy media files to your vault.

3. **Configure Settings**
   - Go to Settings → Nopalito Importer Settings
   - Set import folder, filename format, and metadata options

## Settings

- **Import Folder**: Where to create your imported entries (default: "Day One Import")
- **Use UUID Filenames**: Use entry IDs instead of dates for filenames
- **Include Weather**: Add weather data to frontmatter
- **Include Location**: Add location data to frontmatter  
- **Include Tags**: Add Day One tags to frontmatter

## Output Format

Each entry becomes a markdown file with YAML frontmatter:

```markdown
---
date: 2023-05-15T14:30:00Z
modified: 2023-05-15T14:35:00Z
starred: true
location: "Central Park"
city: "New York"
country: "United States"
coordinates: [40.7829, -73.9654]
weather: "clear"
temperature: 22.5
tags: [travel, outdoor]
---

Your journal entry text here...

## Photos
![Photo 1](attachments/ABC123.jpg)
![Photo 2](attachments/DEF456.jpg)
```

## Development

```bash
# Install dependencies
npm install

# Start development build (watches for changes)
npm run dev

# Build for production
npm run build
```

## License

MIT License - Free and Open Source Software (FOSS)

## Privacy

All processing happens locally in your Obsidian vault. No data is sent to external servers.


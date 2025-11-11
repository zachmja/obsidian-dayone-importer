# Day One Importer for Obsidian

Note: this was 100% vibe-coded.

An Obsidian plugin to import and convert Day One journal exports to Markdown files.

## Features

- 📝 **Complete Journal Import** - Import all Day One entries with full metadata
- 📊 **Frontmatter Support** - Dates, locations, weather, tags, and custom metadata
- 📸 **Media Handling** - References to photos, audio, and videos
- ⚙️ **Customizable** - Configure import folder, filename format, and metadata options
- 🔒 **Privacy First** - All processing happens locally in Obsidian
- 🎯 **Clean Output** - Beautiful, readable markdown files

## Installation

### From GitHub (Manual)
1. Download the latest release from GitHub
2. Extract the files to `{VaultFolder}/.obsidian/plugins/dayone-importer/`
3. Reload Obsidian
4. Enable the plugin in Settings → Community Plugins

### Build from Source

```bash
git clone https://github.com/yourusername/dayone-importer.git
cd dayone-importer
npm install
npm run build
```

## Usage

1. **Export from Day One**
   - In Day One: File → Export → JSON
   - Save the JSON file

2. **Import to Obsidian**
   - Copy your JSON file into your Obsidian vault
   - Click the import icon in the ribbon, or
   - Use command palette: "Import Day One JSON"
   - Plugin will create markdown files in your designated folder

3. **Configure Settings**
   - Go to Settings → Day One Importer
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
![Photo 1](ABC123.jpg)
![Photo 2](DEF456.jpg)
```

## Supported Features

- ✅ Text entries
- ✅ Rich text formatting
- ✅ Date-based or UUID filenames
- ✅ Starred entries
- ✅ Pinned entries
- ✅ All-day events
- ✅ Location (name & coordinates)
- ✅ Weather data
- ✅ Tags
- ✅ Photo references
- ✅ Audio references
- ✅ Video references
- ✅ Failed import reporting

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

## Credits

Inspired by other Day One converters in the Obsidian community.

## Support
3. **Analysis** - Understand your journaling patterns and habits
4. **Publishing** - Convert entries to a readable blog format
5. **Data Science** - Analyze sentiment, locations, weather patterns
6. **Scrapbooking** - Extract photos and create physical albums

## Requirements

- Python 3.6 or higher
- Standard library only (no external dependencies!)

## License

Free to use and modify for personal and commercial purposes.

## Support

Your journal data is private and processed locally. No data is sent to external servers.

For issues or questions, feel free to modify the code to suit your needs!

---

**Happy Journaling! 📔✨**

import { App, Plugin, PluginSettingTab, Setting, Notice, TFile } from 'obsidian';

interface DayOneImporterSettings {
	importFolder: string;
	dateFormat: string;
	useUuidFilenames: boolean;
	includeWeather: boolean;
	includeLocation: boolean;
	includeTags: boolean;
}

const DEFAULT_SETTINGS: DayOneImporterSettings = {
	importFolder: 'Day One Import',
	dateFormat: 'YYYY-MM-DD',
	useUuidFilenames: false,
	includeWeather: true,
	includeLocation: true,
	includeTags: true
}

export default class DayOneImporter extends Plugin {
	settings: DayOneImporterSettings;

	async onload() {
		await this.loadSettings();

		this.addRibbonIcon('import', 'Import Day One Journal', () => {
			this.startImport();
		});

		this.addCommand({
			id: 'import-day-one-json',
			name: 'Import Day One JSON',
			callback: () => {
				this.startImport();
			}
		});

		this.addSettingTab(new DayOneImporterSettingTab(this.app, this));
	}

	async startImport() {
		const jsonFiles = this.app.vault.getFiles().filter(f => f.extension === 'json');
		
		if (jsonFiles.length === 0) {
			new Notice('No JSON files found in vault. Please add your Day One export JSON file.');
			return;
		}

		// If multiple JSON files, we'll use the first one for now
		// TODO: Add file picker dialog
		const jsonFile = jsonFiles[0];
		new Notice(`Importing from ${jsonFile.name}...`);

		try {
			const content = await this.app.vault.read(jsonFile);
			const data = JSON.parse(content);
			
			await this.processEntries(data);
			
			new Notice('Import completed successfully!');
		} catch (error) {
			new Notice(`Import failed: ${error.message}`);
			console.error('Import error:', error);
		}
	}

	async processEntries(data: any) {
		const entries = data.entries || [];
		const importFolder = this.settings.importFolder;

		// Create import folder if it doesn't exist
		if (!this.app.vault.getAbstractFileByPath(importFolder)) {
			await this.app.vault.createFolder(importFolder);
		}

		let successCount = 0;
		let failedCount = 0;
		const failedEntries: any[] = [];

		for (const entry of entries) {
			try {
				await this.createNoteFromEntry(entry, importFolder);
				successCount++;
			} catch (error) {
				failedCount++;
				failedEntries.push({ entry, error: error.message });
				console.error('Failed to import entry:', entry.uuid, error);
			}
		}

		// Create failed imports report if any failed
		if (failedEntries.length > 0) {
			await this.createFailedImportsReport(failedEntries, importFolder);
		}

		new Notice(`Imported ${successCount} entries. ${failedCount} failed.`);
	}

	async createNoteFromEntry(entry: any, folder: string) {
		// Generate filename
		const filename = this.generateFilename(entry);
		const filepath = `${folder}/${filename}.md`;

		// Check if file already exists
		const existingFile = this.app.vault.getAbstractFileByPath(filepath);
		if (existingFile) {
			throw new Error(`File already exists: ${filename}`);
		}

		// Generate markdown content
		const content = this.generateMarkdown(entry);

		// Create the file
		await this.app.vault.create(filepath, content);

		// Handle media files (photos, audio, videos)
		await this.handleMedia(entry, folder, filename);
	}

	generateFilename(entry: any): string {
		if (this.settings.useUuidFilenames) {
			return entry.uuid;
		}

		const date = new Date(entry.creationDate);
		const dateStr = this.formatDate(date);
		
		// Add time to avoid conflicts for same-day entries
		const timeStr = date.toTimeString().split(' ')[0].replace(/:/g, '-');
		
		return `${dateStr}_${timeStr}`;
	}

	formatDate(date: Date): string {
		const year = date.getFullYear();
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const day = String(date.getDate()).padStart(2, '0');
		return `${year}-${month}-${day}`;
	}

	generateMarkdown(entry: any): string {
		const lines: string[] = [];

		// Frontmatter
		lines.push('---');
		lines.push(`date: ${entry.creationDate}`);
		lines.push(`modified: ${entry.modifiedDate || entry.creationDate}`);
		
		if (entry.starred) lines.push('starred: true');
		if (entry.isPinned) lines.push('pinned: true');
		if (entry.isAllDay) lines.push('all-day: true');

		// Tags
		if (this.settings.includeTags && entry.tags) {
			lines.push(`tags: [${entry.tags.join(', ')}]`);
		}

		// Location
		if (this.settings.includeLocation && entry.location) {
			const loc = entry.location;
			if (loc.placeName) lines.push(`location: "${loc.placeName}"`);
			if (loc.localityName) lines.push(`city: "${loc.localityName}"`);
			if (loc.country) lines.push(`country: "${loc.country}"`);
			if (loc.latitude && loc.longitude) {
				lines.push(`coordinates: [${loc.latitude}, ${loc.longitude}]`);
			}
		}

		// Weather
		if (this.settings.includeWeather && entry.weather) {
			const weather = entry.weather;
			if (weather.weatherCode) lines.push(`weather: "${weather.weatherCode}"`);
			if (weather.temperatureCelsius !== undefined) {
				lines.push(`temperature: ${weather.temperatureCelsius}`);
			}
		}

		lines.push('---');
		lines.push('');

		// Main content
		let text = entry.text || '';
		
		// Extract text from richText if available
		if (entry.richText) {
			const richText = this.extractRichText(entry.richText);
			if (richText) text = richText;
		}

		lines.push(text);

		// Add media references
		if (entry.photos && entry.photos.length > 0) {
			lines.push('');
			lines.push('## Photos');
			entry.photos.forEach((photo: any, index: number) => {
				lines.push(`![Photo ${index + 1}](${photo.identifier}.${photo.type || 'jpg'})`);
			});
		}

		if (entry.audios && entry.audios.length > 0) {
			lines.push('');
			lines.push('## Audio');
			entry.audios.forEach((audio: any) => {
				lines.push(`![[${audio.identifier}.${audio.format || 'm4a'}]]`);
			});
		}

		if (entry.videos && entry.videos.length > 0) {
			lines.push('');
			lines.push('## Videos');
			entry.videos.forEach((video: any) => {
				lines.push(`![[${video.identifier}.${video.type || 'mp4'}]]`);
			});
		}

		return lines.join('\n');
	}

	extractRichText(richTextStr: string): string {
		try {
			const richText = JSON.parse(richTextStr);
			const contents = richText.contents || [];
			const textParts: string[] = [];

			contents.forEach((item: any) => {
				if (item.text) {
					textParts.push(item.text);
				}
			});

			return textParts.join('');
		} catch (e) {
			return '';
		}
	}

	async handleMedia(entry: any, folder: string, entryFilename: string) {
		// This would handle copying photos/audio/videos from the Day One export
		// For now, we just reference them - users need to manually copy media files
		// TODO: Implement automatic media file handling from zip exports
	}

	async createFailedImportsReport(failedEntries: any[], folder: string) {
		const lines: string[] = ['# Failed Imports', ''];
		
		failedEntries.forEach(({ entry, error }) => {
			lines.push(`## Entry: ${entry.uuid}`);
			lines.push(`- Date: ${entry.creationDate}`);
			lines.push(`- Error: ${error}`);
			lines.push('');
		});

		const reportPath = `${folder}/Failed Imports.md`;
		await this.app.vault.create(reportPath, lines.join('\n'));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class DayOneImporterSettingTab extends PluginSettingTab {
	plugin: DayOneImporter;

	constructor(app: App, plugin: DayOneImporter) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'Day One Importer Settings' });

		new Setting(containerEl)
			.setName('Import folder')
			.setDesc('Folder where Day One entries will be imported')
			.addText(text => text
				.setPlaceholder('Day One Import')
				.setValue(this.plugin.settings.importFolder)
				.onChange(async (value) => {
					this.plugin.settings.importFolder = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Use UUID filenames')
			.setDesc('Use entry UUIDs as filenames instead of dates')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.useUuidFilenames)
				.onChange(async (value) => {
					this.plugin.settings.useUuidFilenames = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Include weather')
			.setDesc('Include weather information in frontmatter')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeWeather)
				.onChange(async (value) => {
					this.plugin.settings.includeWeather = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Include location')
			.setDesc('Include location information in frontmatter')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeLocation)
				.onChange(async (value) => {
					this.plugin.settings.includeLocation = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Include tags')
			.setDesc('Include Day One tags in frontmatter')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeTags)
				.onChange(async (value) => {
					this.plugin.settings.includeTags = value;
					await this.plugin.saveSettings();
				}));
	}
}

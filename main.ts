import { App, Plugin, PluginSettingTab, Setting, Notice, TFile, Modal } from 'obsidian';
import * as fs from 'fs';
import * as path from 'path';

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

		this.addRibbonIcon('sprout', 'Import Day One Journal (Nopalito)', () => {
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
		new DayOneImportModal(this.app, async ({ data, basePath, fileMap }) => {
			if (data && data.entries) {
				new Notice(`Found ${data.entries.length} entries. Starting import...`);
				await this.processEntries(data.entries, basePath, fileMap);
				new Notice('Day One import complete!');
			} else {
				new Notice('Invalid Day One JSON file.');
			}
		}).open();
	}


	async processEntries(entries: any[], basePath: string, fileMap?: Map<string, File>) {
		const folder = this.settings.importFolder;
		if (!await this.app.vault.adapter.exists(folder)) {
			await this.app.vault.createFolder(folder);
		}

		// Create attachments folder
		const attachmentsFolder = `${folder}/attachments`;
		if (!await this.app.vault.adapter.exists(attachmentsFolder)) {
			await this.app.vault.createFolder(attachmentsFolder);
		}

		let successCount = 0;
		let skippedCount = 0;
		const failedEntries: any[] = [];

		for (const entry of entries) {
			try {
				const isCreated = await this.createNoteFromEntry(entry, folder, basePath, fileMap);
				if (isCreated) {
					successCount++;
				} else {
					skippedCount++;
				}
			} catch (error) {
				console.error(`Failed to import entry ${entry.uuid}:`, error);
				failedEntries.push({ entry, error: error.message });
			}
		}

		if (failedEntries.length > 0) {
			await this.createFailedImportsReport(failedEntries, folder);
			new Notice(`Import complete with errors. See "Failed Imports.md".`);
		}

		new Notice(`Imported: ${successCount}, Skipped: ${skippedCount}, Failed: ${failedEntries.length}`);
	}

	async createNoteFromEntry(entry: any, folder: string, basePath: string, fileMap?: Map<string, File>): Promise<boolean> {
		// Generate filename
		const filename = this.generateFilename(entry);
		const filepath = `${folder}/${filename}.md`;

		// Check if file already exists
		// Generate markdown content
		const content = this.generateMarkdown(entry);

		// Create the file
		await this.app.vault.create(filepath, content);

		return true;
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
				lines.push(`![Photo ${index + 1}](attachments/${photo.identifier}.${photo.type || 'jpg'})`);
			});
		}

		if (entry.audios && entry.audios.length > 0) {
			lines.push('');
			lines.push('## Audio');
			entry.audios.forEach((audio: any) => {
				lines.push(`![[attachments/${audio.identifier}.${audio.format || 'm4a'}]]`);
			});
		}

		if (entry.videos && entry.videos.length > 0) {
			lines.push('');
			lines.push('## Videos');
			entry.videos.forEach((video: any) => {
				lines.push(`![[attachments/${video.identifier}.${video.type || 'mp4'}]]`);
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


	async handleMedia(entry: any, folder: string, basePath: string, fileMap?: Map<string, File>) {
		if (!basePath && !fileMap) return;

		const copyMedia = async (identifier: string, type: string, subfolder: string, ext: string) => {
			const fileName = `${identifier}.${ext}`;
			const destPath = `${folder}/attachments/${fileName}`;

			// Check if file exists in vault
			if (await this.app.vault.adapter.exists(destPath)) {
				return;
			}

			try {
				let data: ArrayBuffer | null = null;

				// Strategy 1: Use File Map (Browser API)
				if (fileMap && fileMap.has(fileName)) {
					const file = fileMap.get(fileName);
					if (file) {
						data = await file.arrayBuffer();
					}
				}
				// Strategy 2: Use fs (Node API) if basePath is available
				else if (basePath) {
					const sourcePath = path.join(basePath, subfolder, fileName);
					if (fs.existsSync(sourcePath)) {
						const buffer = fs.readFileSync(sourcePath);
						data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
					}
				}

				if (data) {
					await this.app.vault.createBinary(destPath, data);
				} else {
					// Silent fail or log? Maybe log verbose
					// console.log(`Media not found: ${fileName}`);
				}
			} catch (err) {
				console.error(`Failed to copy media: ${fileName}`, err);
			}
		};

		if (entry.photos) {
			entry.photos.forEach((photo: any) => {
				copyMedia(photo.identifier, 'photo', 'photos', photo.type || 'jpg');
			});
		}

		if (entry.audios) {
			entry.audios.forEach((audio: any) => {
				copyMedia(audio.identifier, 'audio', 'audios', audio.format || 'm4a');
			});
		}

		if (entry.videos) {
			entry.videos.forEach((video: any) => {
				copyMedia(video.identifier, 'video', 'videos', video.type || 'mp4');
			});
		}
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

class DayOneImportModal extends Modal {
	onChoose: (result: { data: any, basePath: string, fileMap?: Map<string, File> }) => void;
	jsonFile: File | null = null;
	jsonData: any | null = null;

	constructor(app: App, onChoose: (result: { data: any, basePath: string, fileMap?: Map<string, File> }) => void) {
		super(app);
		this.onChoose = onChoose;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.createEl("h2", { text: "Import Day One Journal" });

		const container = contentEl.createDiv();
		container.style.display = "flex";
		container.style.flexDirection = "column";
		container.style.gap = "10px";

		// Step 1: JSON File
		const jsonLabel = container.createEl("label", { text: "Step 1: Select Journal.json" });
		jsonLabel.style.fontWeight = "bold";

		const fileInput = container.createEl("input", { type: "file" });
		fileInput.accept = ".json";

		// Step 2: Media Folder (Hidden initially)
		const folderContainer = container.createDiv();
		folderContainer.style.display = "none";
		folderContainer.style.flexDirection = "column";
		folderContainer.style.gap = "5px";
		folderContainer.style.marginTop = "15px";
		folderContainer.style.borderTop = "1px solid var(--background-modifier-border)";
		folderContainer.style.paddingTop = "15px";

		const folderLabel = folderContainer.createEl("label", { text: "Step 2: Select Media Folder" });
		folderLabel.style.fontWeight = "bold";

		const folderDesc = folderContainer.createEl("p", {
			text: "We couldn't detect the file path (browser security). Please select your Day One export folder (the one containing 'photos', 'audio', etc.) so we can import your media.",
			cls: "setting-item-description"
		});

		const folderInput = folderContainer.createEl("input", { type: "file" });
		folderInput.setAttribute("webkitdirectory", "");
		folderInput.setAttribute("directory", "");

		fileInput.addEventListener("change", async (e: Event) => {
			const target = e.target as HTMLInputElement;
			if (!target.files?.length) return;

			const file = target.files[0];
			this.jsonFile = file;

			const reader = new FileReader();
			reader.onload = async (e) => {
				try {
					const result = e.target?.result;
					if (typeof result === "string") {
						this.jsonData = JSON.parse(result);

						// @ts-ignore - path property exists on File object in Electron
						const filePath = file.path;

						if (filePath) {
							// Happy path: we have the path, we can use fs
							const basePath = path.dirname(filePath);
							this.onChoose({ data: this.jsonData, basePath });
							this.close();
						} else {
							// Sad path: no path, need manual folder selection
							console.warn("File path missing. Requesting folder selection.");
							folderContainer.style.display = "flex";
							fileInput.disabled = true;
							new Notice("Please select your media folder to continue.");
						}
					}
				} catch (error) {
					new Notice("Failed to parse JSON file. Check console.");
					console.error(error);
				}
			};
			reader.readAsText(file);
		});

		folderInput.addEventListener("change", (e: Event) => {
			const target = e.target as HTMLInputElement;
			if (!target.files?.length) return;

			const fileMap = new Map<string, File>();
			// Index all files by name for quick lookup
			for (let i = 0; i < target.files.length; i++) {
				const file = target.files[i];
				fileMap.set(file.name, file);
			}

			if (this.jsonData) {
				this.onChoose({ data: this.jsonData, basePath: "", fileMap });
				this.close();
			}
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
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

		containerEl.createEl('h2', { text: 'Nopalito Importer Settings' });

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

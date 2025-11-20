import { copyFileSync, existsSync, mkdirSync, statSync } from "fs";
import { resolve, join } from "path";
import * as readline from "readline";

const PLUGIN_DIR_NAME = 'nopalito-importer';

const installPlugin = (targetPath) => {
    // Clean up the path: remove backslashes used for escaping spaces (common in terminal drag-and-drop)
    // But only if the OS is not Windows (where backslash is the separator).
    // For simplicity in this environment (Mac), we'll assume backslashes before spaces are escapes.
    let cleanPath = targetPath.trim();

    // Remove surrounding quotes if present
    if ((cleanPath.startsWith('"') && cleanPath.endsWith('"')) || (cleanPath.startsWith("'") && cleanPath.endsWith("'"))) {
        cleanPath = cleanPath.slice(1, -1);
    }

    cleanPath = cleanPath.replace(/\\ /g, " ").trim();

    // Remove trailing slash if present
    if (cleanPath.endsWith("/") || cleanPath.endsWith("\\")) {
        cleanPath = cleanPath.slice(0, -1);
    }

    let installPath = resolve(cleanPath);
    const pluginDirName = PLUGIN_ID;

    console.log(`Processing path: ${installPath}`);

    // Heuristic 1: Is this the specific plugin folder already? (ends in platano-importer)
    if (installPath.endsWith(pluginDirName)) {
        // Good to go
    }
    // Heuristic 2: Is this the 'plugins' folder?
    else if (installPath.endsWith("plugins")) {
        installPath = join(installPath, pluginDirName);
    }
    // Heuristic 3: Is this the '.obsidian' folder?
    else if (installPath.endsWith(".obsidian")) {
        installPath = join(installPath, "plugins", pluginDirName);
    }
    // Heuristic 4: Is this the vault root? (contains .obsidian)
    else if (existsSync(join(installPath, ".obsidian"))) {
        installPath = join(installPath, ".obsidian", "plugins", pluginDirName);
    }
    // Fallback: Just append the plugin ID to be safe, unless the user really knows what they are doing.
    // If the path doesn't end in 'plugins' or the ID, we assume it's a custom folder or the vault root.
    // To be safe, if it looks like a vault root (has .obsidian), we already caught it.
    // If it doesn't, maybe they pointed to some other folder. Let's ask or just append.
    else {
        console.log("Could not auto-detect Obsidian structure. Appending plugin folder name to be safe.");
        installPath = join(installPath, pluginDirName);
    }

    if (!existsSync(installPath)) {
        console.log(`Creating directory: ${installPath}`);
        mkdirSync(installPath, { recursive: true });
    }

    console.log(`Installing to: ${installPath}`);

    try {
        copyFileSync("main.js", join(installPath, "main.js"));
        copyFileSync("manifest.json", join(installPath, "manifest.json"));
        if (existsSync("styles.css")) {
            copyFileSync("styles.css", join(installPath, "styles.css"));
        }
        console.log("✅ Plugin installed successfully!");
        console.log("Please reload Obsidian to see the changes.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error copying files:", err);
        process.exit(1);
    }
};

const targetDir = process.argv[2];

if (targetDir) {
    installPlugin(targetDir);
} else {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log("\n--- Platano Importer Installer ---");
    console.log("Tip: You can drag and drop your folder here.");
    console.log("Please enter the path to your Obsidian Vault (or the plugins folder):");

    rl.question("> ", (answer) => {
        if (!answer) {
            console.error("No path provided. Exiting.");
            process.exit(1);
        }
        installPlugin(answer);
        rl.close();
    });
}

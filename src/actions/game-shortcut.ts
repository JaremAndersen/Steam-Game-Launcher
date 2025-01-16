import streamDeck, {
	action,
	DidReceiveSettingsEvent,
	JsonValue,
	KeyDownEvent,
	PropertyInspector,
	SendToPluginEvent,
	SingletonAction,
	WillAppearEvent,
} from "@elgato/streamdeck";
import * as child_process from "node:child_process";
import fs from "node:fs";
import path from "node:path";

type GameShortcutSettings = {
	gameList?: string[];
	selectedGame?: string;
};

type DataSourcePayload = {
	event: string;
};

type Game = {
	gameName: string;
	appId: string;
};

@action({ UUID: "com.jarem.steam.game.launcher.shortcut" })
export class GameShortcut extends SingletonAction<GameShortcutSettings> {
	override async onWillAppear(ev: WillAppearEvent<GameShortcutSettings>): Promise<void> {
		streamDeck.logger.info("GameShortcut willAppear");
	}

	override async onKeyDown(ev: KeyDownEvent<GameShortcutSettings>): Promise<void> {
		child_process.exec(
			`"C:\\Program Files (x86)\\Steam\\steam.exe" steam://rungameid/${ev.payload.settings.selectedGame}`,
			(error, stdout, stderr) => {
				if (error) {
					streamDeck.logger.error(`error: ${error.message}`);
					return;
				}
				if (stderr) {
					streamDeck.logger.error(`stderr: ${stderr}`);
					return;
				}
				streamDeck.logger.info(`stdout: ${stdout}`);
			},
		);
	}

	override onDidReceiveSettings(ev: DidReceiveSettingsEvent<GameShortcutSettings>): void | Promise<void> {
		const game = ev.payload.settings.selectedGame;
		if (game) {
			const path = this.getImagePath(game);
			ev.action.setImage(path);
		}
	}

	override onSendToPlugin(ev: SendToPluginEvent<DataSourcePayload, GameShortcutSettings>): void | Promise<void> {
		if (ev.payload?.event === "getGames") {
			const games = this.getGames();

			ev.action.setSettings({ gameList: games });

			const items = games.map((game) => {
				return {
					label: game.gameName,
					value: game.appId,
				};
			});

			streamDeck.ui.current?.sendToPropertyInspector({
				event: "getGames",
				items: items,
			});
		}
	}

	private getGames() {
		const libraries = this.getLibraryFolders();

		const games = libraries.flatMap((folderPath) => {
			try {
				const files = fs.readdirSync(folderPath).filter((file) => {
					return file.startsWith("appmanifest");
				});

				return files.reduce<Game[]>((acc, file) => {
					const filePath = path.join(folderPath, file);
					const fileContent = fs.readFileSync(filePath, "utf-8");
					const gameName = fileContent.match(/"name"\s*"(.*?)"/)?.[1];
					const appId = fileContent.match(/"appid"\s*"(.*?)"/)?.[1];
					if (gameName && appId) {
						acc.push({ gameName, appId });
					}
					return acc;
				}, []);
			} catch (e) {
				streamDeck.logger.error(`Error reading folder ${folderPath}`);
				return [];
			}
		});

		return games.sort((a, b) => {
			return a.gameName.localeCompare(b.gameName);
		});
	}

	private getLibraryFolders(): string[] {
		const libraryFoldersPath = path.join("C:\\Program Files (x86)\\Steam\\config", "libraryfolders.vdf");

		const file = fs.readFileSync(libraryFoldersPath, "utf-8");
		const pattern = /"path"\s+"([^"]+)"/g;
		const paths = [];
		let match;
		while ((match = pattern.exec(file)) !== null) {
			paths.push(path.join(match[1], "steamapps"));
		}

		return paths;
	}

	private getImagePath(appId: string): string {
		const folder = "C:\\Program Files (x86)\\Steam\\appcache\\librarycache";
		return path.join(folder, `${appId}_logo.png`);
	}
}

import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { GameShortcut } from "./actions/game-shortcut";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel(LogLevel.TRACE);

streamDeck.actions.registerAction(new GameShortcut());

// Finally, connect to the Stream Deck.
streamDeck.connect();

import type { GameMode } from "../game/facts"

// Etykiety trybów dla gracza (edytowalne). Glyph matematyczny, nie emoji —
// spójnie dla wszystkich trybów; tokeny są KODEM (persystowane w jajkach).
export const MODE_LABELS: Record<GameMode, string> = {
	mult: "× Mnożenie",
	div: "÷ Dzielenie",
	gap: "? Zgadnij",
	pairs: "= Dzielniki",
	feed: "> Porównywanie",
}

// Sama nazwa (baner „Nowa zabawa na start: …!")
export const MODE_NAMES: Record<GameMode, string> = {
	mult: "Mnożenie",
	div: "Dzielenie",
	gap: "Zgadnij",
	pairs: "Dzielniki",
	feed: "Porównywanie",
}

// Plakietka trybu na jajku/potworku ekskluzywnym (null = bez plakietki)
export const MODE_BADGES: Partial<Record<GameMode, string>> = {
	div: "÷",
	gap: "🧩", // nie „?" — koliduje z konwencją „???" = nieznany potworek
	pairs: "=",
	feed: ">",
}

// Rząd 1 = bazowe widoki faktu, rząd 2 = zabawy odblokowywane bramami
export const MODE_ROWS: readonly (readonly GameMode[])[] = [
	["mult", "div", "gap"],
	["pairs", "feed"],
]

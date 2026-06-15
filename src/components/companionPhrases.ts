// Teksty przyjaciela — PROPOZYCJE do dopracowania (player-facing PL).
// Rejestr kumpla/rówieśnika. `{imie}` podmieniamy na imię przyjaciela (withName).
// Formy żeńskie spójne z „Mistrzyni Kolekcji". Kibicowanie w RUNDZIE jest bez tekstu
// (sam ruch) — tu tylko Home (przyjaciel) i wioska (dowolny mieszkaniec).

export const GREET_HELLO = [
	"Cześć! Czekałem na ciebie 💛",
	"O, jesteś! Bawmy się!",
	"Hej, hej! Co dziś gramy?",
	"{imie} macha do ciebie 👋",
	"Dobrze, że jesteś!",
	"Witaj z powrotem!",
	"Cześć, kumpelo!",
	"Jak miło cię widzieć!",
	"Hejka! Gotowa na potworki?",
	"Siemka! Trochę mi się nudziło 💛",
	"O, moja ulubiona osoba!",
	"{imie} czekał właśnie na ciebie!",
	"Super, że wróciłaś!",
	"Cześć! Mam ochotę na zabawę 🎈",
	"Witaj, witaj!",
	"Hej! Razem będzie wesoło!",
]

export const GREET_NEWDAY = [
	"Dzień dobry! Nowy dzień, nowe potworki ✨",
	"Gotowa na przygodę?",
	"Witaj! Zaczynamy?",
	"Dzień dobry! Pięknie dziś świeci ☀️",
	"Nowy dzień — nowe wyzwania!",
	"Dzień dobry, śpiochu! 😴",
	"Hej! Dziś będzie świetny dzień!",
	"Dobry ranek! Co dziś zdobędziemy?",
	"Witaj w nowym dniu! 🌞",
	"Dzień dobry! Wyspałaś się?",
	"Nowy dzień, nowe iskierki ✨",
	"Cześć! Zaczynamy z przytupem!",
]

export const GREET_MISSED = [
	"Tęskniłem za tobą! 💛",
	"Wróciłaś! Najlepszy dzień!",
	"Tyle się działo — chodź do wioski!",
	"Ojej, ale się stęskniłem! 💛",
	"Wróciłaś! Skakałem z radości!",
	"Najlepsza wiadomość dnia — jesteś!",
	"Czekałem cierpliwie i już jesteś! 🥰",
	"Hura, wróciłaś do nas!",
	"Wioska czekała na ciebie!",
	"Tęskniliśmy wszyscy! 💛",
	"Jak dobrze, że znów razem!",
	"Wróciłaś! Świętujemy! 🎉",
]

// Bazowe zaczepki w wiosce — dowolny mieszkaniec, więc BEZ `{imie}` (w wiosce nie
// podstawiamy imienia). Listę spreaduje TAP poniżej, żeby się nie dublować.
export const VILLAGE_TAP = [
	"Łaskocze! 😆",
	"Hihi!",
	"Hop!",
	"Cześć!",
	"Jeszcze raz!",
	"Buu! 👻",
	"Hej, widzę cię!",
	"Hop, hop!",
	"Połaskocz jeszcze!",
	"Jestem tu!",
	"Brzdęk!",
	"Hejka!",
	"Ale fajnie skaczę, co?",
	"Lubię cię! 💚",
	"Robimy psikusa?",
	"Pstryk!",
	"Tu jestem!",
	"Mniam, ciasteczko? 🍪",
]

// Dotyk przyjaciela na Home: baza z wioski + wpisy „kumplowskie"/z imieniem
// (withName podstawia `{imie}`; wpisy bez `{imie}` przechodzą bez zmian).
export const TAP = [
	...VILLAGE_TAP,
	"To ja, {imie}! 💛",
	"{imie} cię lubi!",
	"Pogłaszcz mnie jeszcze!",
	"Jesteśmy zgranym duetem!",
	"Razem damy radę!",
	"Najlepszy z ciebie kumpel!",
	"{imie} jest gotowy do gry!",
	"Bawimy się dalej? 🎈",
]

export const TAP_JACKPOT = [
	"Hura! 🎉",
	"Ale super!",
	"Najlepszy dzień!",
	"Wow, ale czad!",
	"To było ekstra!",
	"Niesamowite!",
	"Jesteś the best! ⭐",
	"Tańczymy! 💃",
	"Mega zabawa!",
	"Łapię cię w skok! 🤸",
	"Bomba!",
	"Pełnia radości! 🌈",
]

// Losuje wpis z banku, unikając powtórzenia ostatniego (jedna próba wystarczy).
export function pickPhrase(
	list: readonly string[],
	last: string | null,
): string {
	if (list.length === 0) return ""
	if (list.length === 1) return list[0] as string
	const i = Math.floor(Math.random() * list.length)
	const p = list[i] as string
	return p === last ? (list[(i + 1) % list.length] as string) : p
}

export function withName(text: string, name: string): string {
	return text.replace(/\{imie\}/g, name)
}

// Lokalny znacznik dnia (YYYY-M-D) — baza dla licznika „w ilu różnych dni grano",
// powitań przyjaciela i bonusu żołdu za pierwszą rundę dnia. Deterministyczny
// względem wstrzykiwanego `now` (czysty moduł game/ — Date.now() zostaje w store).
export function dayStamp(now: number): string {
	const d = new Date(now)
	return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

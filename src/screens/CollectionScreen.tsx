import { memo, useState } from "react"
import { BigButton } from "../components/BigButton"
import { CARD_SHELL, CardModal } from "../components/CardModal"
import { CosmeticArt, EquippedBackground } from "../components/CosmeticArt"
import { ExpeditionDetails } from "../components/ExpeditionDetails"
import { HelpTip } from "../components/HelpTip"
import { MonsterStage } from "../components/MonsterStage"
import { MODE_BADGES, MODE_NAMES } from "../components/modeLabels"
import { CARD_THEME, RARITY_META } from "../components/rarity"
import { ownedCount as collectionCount } from "../game/collection"
import type { CosmeticSlot, CosmeticsState } from "../game/cosmetics"
import {
	COSMETICS,
	COSMETICS_BY_ID,
	equippedFor,
	isOwned,
} from "../game/cosmetics"
import {
	EXPEDITIONS,
	expeditionProgress,
	expeditionUnlocked,
	findChanceLabel,
} from "../game/expeditions"
import { RARITY_ORDER } from "../game/rewards"
import { buildingLevel } from "../game/village"
import { wishEgg } from "../game/wishEgg"
import {
	isDivisionOnly,
	isFeedOnly,
	isGapOnly,
	isPairsOnly,
	MONSTER_COUNT,
	MONSTERS,
} from "../monsters/catalog"
import { loreFor } from "../monsters/lore"
import { MonsterSvg } from "../monsters/MonsterSvg"
import { originOf } from "../monsters/world"
import { useGame } from "../store/store"

// Wyświetlanie po rzadkości (common→legendary), w obrębie rzadkości po id.
// Id nie są już ciągłe po rzadkości (nowe potworki dochodzą na końcu), więc
// sortujemy jawnie zamiast polegać na kolejności id.
const SORTED_MONSTERS = [...MONSTERS].sort(
	(a, b) =>
		RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) ||
		a.id - b.id,
)

// Garderoba na karcie posiadanego potworka: sekcja ZWIJANA (domyślnie zwinięta
// — karta ma zostać trofeum, nie panelem sterowania; kolejność sekcji modala:
// przyjaciel → Ubierz 🎩 → Wyprawa 🎒, patrz plans/README.md „Shared-
// surface governance"). Per slot poziomy rządek kupionych rzeczy + chip
// „zdejmij"; tap zakłada od ręki (equipCosmetic), założona rzecz ma ring.
function WardrobeSection({ monsterId }: { monsterId: number }) {
	const cosmetics = useGame((s) => s.cosmetics)
	const equipCosmetic = useGame((s) => s.equipCosmetic)
	const [open, setOpen] = useState(false)
	const eq = equippedFor(cosmetics, monsterId)
	const ownedItems = COSMETICS.filter((c) => isOwned(cosmetics, c.id))
	const slots: { slot: CosmeticSlot; label: string }[] = [
		{ slot: "hat", label: "Kapelusze" },
		{ slot: "aura", label: "Aury" },
		{ slot: "background", label: "Tła" },
	]
	// Ramki (slot "frame", plan 014) mają własny rządek pod spodem: chip
	// „Bez ramki" przywraca oprawę rzadkości, chipy noszą nazwę widocznym
	// tekstem (swatch pokazuje tylko kolor krawędzi).
	const ownedFrames = ownedItems.filter((c) => c.slot === "frame")
	return (
		<div className="w-full rounded-2xl bg-violet-50">
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="flex min-h-16 w-full touch-manipulation items-center justify-between px-4 py-3 text-lg font-extrabold text-grape-dark active:scale-[0.98]"
			>
				<span>Ubierz 🎩</span>
				<span
					className={`text-xl transition-transform ${open ? "rotate-180" : ""}`}
				>
					▾
				</span>
			</button>
			{open &&
				(ownedItems.length === 0 ? (
					// pusta garderoba prowadzi do Sklepiku
					<div className="px-4 pb-4 text-center text-sm font-bold text-slate-500">
						Kapelusze kupisz w Sklepiku w Wiosce!
					</div>
				) : (
					<div className="flex flex-col gap-2 px-3 pb-3">
						{slots.map(({ slot, label }) => {
							const items = ownedItems.filter((c) => c.slot === slot)
							if (items.length === 0) return null
							return (
								<div key={slot}>
									<div className="mb-1 text-xs font-extrabold uppercase tracking-wide text-slate-400">
										{label}
									</div>
									{/* p-1 (nie pb-1): przewijalna oś X wymusza clip w osi Y, a ring-4
									    zaznaczenia rysuje się POZA boksem chipa — bez paddingu ze
									    wszystkich stron obwódka ucina się od góry/boków */}
									<div className="flex gap-2 overflow-x-auto p-1">
										<button
											type="button"
											aria-label="Zdejmij"
											onClick={() => equipCosmetic(monsterId, slot, null)}
											className={`flex h-16 w-16 shrink-0 touch-manipulation items-center justify-center rounded-2xl bg-white text-2xl font-extrabold text-slate-400 active:scale-95 ${
												eq[slot] === undefined ? "ring-4 ring-amber-300" : ""
											}`}
										>
											∅
										</button>
										{items.map((item) => (
											<button
												key={item.id}
												type="button"
												aria-label={item.name}
												onClick={() => equipCosmetic(monsterId, slot, item.id)}
												className={`flex h-16 w-16 shrink-0 touch-manipulation items-center justify-center rounded-2xl bg-white active:scale-95 ${
													eq[slot] === item.id ? "ring-4 ring-amber-300" : ""
												}`}
											>
												<CosmeticArt id={item.id} size={44} />
											</button>
										))}
									</div>
								</div>
							)
						})}
						{ownedFrames.length > 0 && (
							<div>
								{/* etykieta rządka ramek */}
								<div className="mb-1 text-xs font-extrabold uppercase tracking-wide text-slate-400">
									Ramka
								</div>
								{/* p-1 (nie pb-1): przewijalna oś X wymusza clip w osi Y, a ring-4
									    zaznaczenia rysuje się POZA boksem chipa — bez paddingu ze
									    wszystkich stron obwódka ucina się od góry/boków */}
								<div className="flex gap-2 overflow-x-auto p-1">
									{/* „Bez ramki" = oprawa rzadkości */}
									<button
										type="button"
										onClick={() => equipCosmetic(monsterId, "frame", null)}
										className={`flex h-16 shrink-0 touch-manipulation items-center gap-1.5 rounded-2xl bg-white px-3 text-sm font-extrabold text-slate-500 active:scale-95 ${
											eq.frame === undefined ? "ring-4 ring-amber-300" : ""
										}`}
									>
										{eq.frame === undefined && <span>✓</span>}
										<span>Bez ramki</span>
									</button>
									{ownedFrames.map((item) => (
										<button
											key={item.id}
											type="button"
											onClick={() => equipCosmetic(monsterId, "frame", item.id)}
											className={`flex h-16 shrink-0 touch-manipulation items-center gap-2 rounded-2xl bg-white px-3 active:scale-95 ${
												eq.frame === item.id ? "ring-4 ring-amber-300" : ""
											}`}
										>
											<span
												className={`h-8 w-8 shrink-0 rounded-lg border-4 bg-white ${item.cardClasses ?? ""}`}
											/>
											<span className="whitespace-nowrap text-sm font-extrabold text-slate-600">
												{eq.frame === item.id && "✓ "}
												{item.name}
											</span>
										</button>
									))}
								</div>
							</div>
						)}
					</div>
				))}
		</div>
	)
}

// Wyprawa na karcie posiadanego potworka: sekcja ZWIJANA (domyślnie zwinięta)
// POD garderobą — kolejność sekcji modala: przyjaciel → Ubierz 🎩 → Wyprawa 🎒
// (binding w plans/README.md „Shared-surface governance"). Jedna wyprawa naraz,
// przyjaciel zostaje w domu (guard w store jest źródłem prawdy — tu tylko
// łagodne wyjaśnienia, nigdy ton błędu), zawrócenie darmowe i natychmiastowe.
function ExpeditionSection({
	monsterId,
	onSent,
}: {
	monsterId: number
	onSent: () => void
}) {
	const expedition = useGame((s) => s.expedition)
	const totalRounds = useGame((s) => s.totalRounds)
	const ownedMonsters = useGame((s) => s.ownedMonsters)
	const companionId = useGame((s) => s.companionId)
	const village = useGame((s) => s.village)
	const sendExpedition = useGame((s) => s.sendExpedition)
	const [open, setOpen] = useState(false)

	const isTraveler = expedition?.monsterId === monsterId
	const progress =
		isTraveler && expedition
			? expeditionProgress(expedition, totalRounds)
			: null

	return (
		<div className="w-full rounded-2xl bg-emerald-50">
			<div className="flex items-center gap-1 pr-3">
				<button
					type="button"
					onClick={() => setOpen((o) => !o)}
					className="flex min-h-16 min-w-0 flex-1 touch-manipulation items-center justify-between px-4 py-3 text-lg font-extrabold text-grape-dark active:scale-[0.98]"
				>
					<span>
						Wyprawa 🎒
						{progress && (
							<span className="ml-2 text-sm font-extrabold text-emerald-600">
								{progress.done}/{progress.total}
							</span>
						)}
					</span>
					<span
						className={`text-xl transition-transform ${open ? "rotate-180" : ""}`}
					>
						▾
					</span>
				</button>
				<HelpTip
					placement="top"
					align="right"
					text="Wyślij potworka na wyprawę! Każda ukończona runda przybliża go do powrotu — wróci z iskierkami ✨, a z dalszych wypraw czasem przyprowadzi nowego potworka! Kolejne wyprawy otwiera Plac Zabaw w Wiosce. W każdej chwili możesz go zawrócić, nic się nie stanie."
				/>
			</div>
			{open &&
				(isTraveler ? (
					<div className="flex flex-col gap-2 px-3 pb-3">
						{/* te same szczegóły co modal na Home */}
						<ExpeditionDetails />
					</div>
				) : monsterId === companionId ? (
					// przyjaciel nigdy nie wyjeżdża:
					// łagodna linijka, nie zablokowany przycisk
					<div className="px-4 pb-4 text-center text-sm font-bold text-slate-500">
						Przyjaciel woli zostać z Tobą 💛
					</div>
				) : expedition ? (
					// ktoś inny jest w drodze
					<div className="px-4 pb-4 text-center text-sm font-bold text-slate-500">
						Ktoś już jest na wyprawie — poczekaj na jego powrót
					</div>
				) : (
					<div className="flex flex-col gap-2 px-3 pb-3">
						{EXPEDITIONS.map((def) => {
							const unlocked = expeditionUnlocked(village, def.id)
							const label = findChanceLabel(def, ownedMonsters)
							// treść wiersza WSPÓLNA dla obu gałęzi — typ zablokowany bramą
							// Placu Zabaw to zajawka (wzór półek Sklepiku): nazwa i nagroda
							// w pełnym kontraście, chip kieruje do budowy, nigdy ton błędu
							const row = (
								<>
									<span className="flex w-full items-baseline justify-between gap-2">
										<span className="text-lg font-extrabold text-grape-dark">
											{def.name}
										</span>
										<span className="whitespace-nowrap text-sm font-extrabold text-slate-500">
											{def.durationRounds} rund ·{" "}
											<span className="text-amber-500">
												+{def.rewardIskierki} ✨
											</span>
										</span>
									</span>
									<span className="text-xs font-bold text-slate-400">
										{def.description}
									</span>
									{/* własny chip, nie w nagłówku (długi tekst rozpychał kartę) */}
									{label && (
										<span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-extrabold text-violet-600">
											{label}
										</span>
									)}
									{!unlocked && (
										<span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-extrabold text-sky-600">
											{buildingLevel(village, "plac-zabaw") === 0
												? "Zbuduj Plac Zabaw w Wiosce! 🔒"
												: "Ulepsz Plac Zabaw! 🔒"}
										</span>
									)}
								</>
							)
							const rowClass =
								"flex min-h-16 w-full min-w-0 flex-col items-start justify-center gap-1 rounded-2xl px-4 py-2"
							return unlocked ? (
								<button
									key={def.id}
									type="button"
									onClick={() => {
										sendExpedition(monsterId, def.id)
										onSent()
									}}
									className={`${rowClass} touch-manipulation bg-white text-left active:scale-[0.98]`}
								>
									{row}
								</button>
							) : (
								<div key={def.id} className={`${rowClass} bg-white/60`}>
									{row}
								</div>
							)
						})}
					</div>
				))}
		</div>
	)
}

// Karta kolekcjonerska POSIADANEGO potworka: strefy okno z artem → baner →
// opis → mini-staty → ciekawostka → przyjaciel → Ubierz 🎩 → Wyprawa 🎒
// (kolejność sekcji binding w plans/README.md „Shared-surface governance”).
// Komponent renderuje przewijalny kontener karty W ŚRODKU — ramka jest jego
// (założona ramka planu 014 podmienia oprawę rzadkości); powłoka modala (tło
// + przypięty ✕) zostaje w CollectionScreen.
function MonsterCard({
	monsterId,
	onClose,
}: {
	monsterId: number
	onClose: () => void
}) {
	const owned = useGame((s) => s.ownedMonsters[monsterId])
	const companionId = useGame((s) => s.companionId)
	const expedition = useGame((s) => s.expedition)
	const isTraveler = expedition?.monsterId === monsterId
	const setCompanion = useGame((s) => s.setCompanion)
	const unlockedStage = useGame((s) => s.unlockedStage)
	const cosmetics = useGame((s) => s.cosmetics)

	// caller renderuje kartę tylko dla posiadanego istniejącego potworka
	// (guard PRZED pochodnymi — dalej `monster` jest już pewny)
	const monster = MONSTERS[monsterId]
	if (!monster || !owned) return null

	// Paszport: krainę nazywamy wyłącznie gdy odblokowana (inaczej zdradziłaby
	// przyszłą tabliczkę → „tajemnica tabliczki”).
	const lore = loreFor(monsterId)
	const origin = originOf(monsterId)
	const originKnown =
		origin !== null &&
		(origin.kind === "region" ? origin.stage <= unlockedStage : true)
	// Oprawa karty wg rzadkości (ramka/blask całego modala, gradient okna z artem itd.)
	const cardTheme = CARD_THEME[monster.rarity]
	// Założona ramka (kosmetyka planu 014, slot "frame") podmienia SAMĄ ramkę
	// modala (cardClasses za cardTheme.card); rzadkość zostaje czytelna przez
	// wstążkę RARITY_META.badge i nietknięte kafle siatki. Bez ramki wygląd
	// identyczny jak dotąd. Uwaga: seam to kontener karty, NIE prop `frame`
	// MonsterStage (okno z artem to tylko jedna strefa karty) — ewentualny
	// przyszły refactor modala przez MonsterStage ma zachować ramkę karty.
	const equippedFrameId = equippedFor(cosmetics, monsterId).frame
	const frameDef =
		equippedFrameId !== undefined
			? COSMETICS_BY_ID.get(equippedFrameId)
			: undefined

	return (
		<div className={`${CARD_SHELL} ${frameDef?.cardClasses ?? cardTheme.card}`}>
			{/* ===== OKNO Z ARTEM — bohater karty ===== */}
			{/* shrink-0: okno ma overflow-hidden (min-height liczy się jako 0),
			    więc bez tego flexbox ściska JE zamiast przewijać dłuższą kartę
			    (karta urosła o garderobę) */}
			<div
				className={`relative w-full shrink-0 overflow-hidden rounded-3xl border-2 bg-gradient-to-br p-3 ${cardTheme.window} ${cardTheme.windowBorder}`}
			>
				{/* założone tło wypełnia całe okno z artem (okno ma overflow-hidden
				    i własne zaokrąglenie) */}
				<EquippedBackground monsterId={monsterId} className="" />
				{/* radialny blask za potworkiem */}
				<div
					className={`pointer-events-none absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl ${cardTheme.halo}`}
				/>
				{/* iskry — tylko legendarny */}
				{monster.rarity === "legendary" && (
					<>
						<div className="anim-sparkle pointer-events-none absolute left-2 top-2 text-xl">
							✨
						</div>
						<div className="anim-sparkle pointer-events-none absolute right-2 bottom-2 text-xl">
							✨
						</div>
					</>
				)}
				{/* rogi założonej ramki — kotwiczone w OKNIE Z ARTEM (jego
			    własny relative), NIE w kontenerze modala: kontener jest
			    elementem przewijania (overflow-y-auto), więc rogi
			    zakotwiczone w nim pływałyby nad opisem; tu odjeżdżają
			    ze scrollem jak zwykła treść. Bez z-index — wstążka
			    rzadkości (z-10) zawsze zostaje na wierzchu. */}
				{frameDef?.cornerEmoji && (
					<>
						<span className="pointer-events-none absolute left-1 top-1 text-2xl">
							{frameDef.cornerEmoji}
						</span>
						<span className="pointer-events-none absolute right-1 top-1 text-2xl">
							{frameDef.cornerEmoji}
						</span>
					</>
				)}
				{/* wstążka rzadkości */}
				<div
					className={`absolute top-2 right-2 z-10 rounded-full px-3 py-1 text-sm font-extrabold shadow ${RARITY_META[monster.rarity].badge}`}
				>
					{RARITY_META[monster.rarity].label}
				</div>
				{isDivisionOnly(monsterId) && (
					<div className="absolute top-2 left-2 z-10 rounded-full bg-violet-500 px-2.5 py-1 text-sm font-extrabold text-white shadow">
						➗
					</div>
				)}
				{isGapOnly(monsterId) && (
					<div className="absolute top-2 left-2 z-10 rounded-full bg-fuchsia-500 px-2.5 py-1 text-sm font-extrabold text-white shadow">
						🧩
					</div>
				)}
				{isPairsOnly(monsterId) && (
					<div className="absolute top-2 left-2 z-10 rounded-full bg-sky-500 px-2.5 py-1 text-sm font-extrabold text-white shadow">
						{MODE_BADGES.pairs}
					</div>
				)}
				{isFeedOnly(monsterId) && (
					<div className="absolute top-2 left-2 z-10 rounded-full bg-rose-500 px-2.5 py-1 text-sm font-extrabold text-white shadow">
						{MODE_BADGES.feed}
					</div>
				)}
				<div className="relative flex justify-center">
					{/* przez MonsterStage — karta pokazuje założony strój
				    (każdy potworek z kosmetyką renderuje się przez Stage);
				    podróżnik „poszedł" — w oknie zostaje plecak, reszta karty bez zmian */}
					{isTraveler ? (
						<div className="anim-float flex h-[180px] items-center justify-center text-[7rem] leading-none">
							🎒
						</div>
					) : (
						<MonsterStage id={monsterId} size={180} animate={true} />
					)}
				</div>
			</div>

			{/* ===== BANER: NAZWA + GATUNEK ===== */}
			<div
				className={`flex w-full flex-col items-center gap-1 rounded-2xl px-4 py-3 ${cardTheme.banner}`}
			>
				<div className="text-3xl font-extrabold leading-tight text-slate-700">
					{monster.name}
				</div>
				{lore && (
					<div className={`text-base font-extrabold ${cardTheme.accent}`}>
						{lore.species}
					</div>
				)}
				{monster.rarity === "legendary" && (
					<div className="anim-rainbow mt-0.5 h-1.5 w-24 rounded-full bg-gradient-to-r from-amber-300 via-pink-300 to-violet-300" />
				)}
			</div>

			{/* ===== OPIS ===== */}
			{lore && (
				<p className="w-full rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm font-bold leading-snug text-slate-600">
					{lore.blurb}
				</p>
			)}

			{/* ===== MINI-STATY: kraina pochodzenia + data poznania ===== */}
			<div className="flex w-full items-stretch gap-2">
				{origin && (
					<div className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl bg-slate-50 px-2 py-2">
						<span className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-400">
							Pochodzi z
						</span>
						{originKnown ? (
							<span
								className={`w-full rounded-full px-2 py-1 text-center text-xs font-extrabold leading-snug ${origin.color}`}
							>
								{origin.emoji} {origin.name}
							</span>
						) : (
							<span className="w-full rounded-full bg-slate-100 px-2 py-1 text-center text-xs font-extrabold leading-snug text-slate-400">
								🌫️ Z nieodkrytej krainy…
							</span>
						)}
					</div>
				)}
				<div className="flex flex-col items-center justify-between gap-1.5 rounded-2xl bg-slate-50 px-3 py-2">
					<span className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-400">
						Poznany
					</span>
					<span className="-rotate-3 rounded-lg border-2 border-bubblegum/40 px-2 py-0.5 text-xs font-extrabold tracking-wide text-bubblegum">
						{new Date(owned.hatchedAt).toLocaleDateString("pl-PL")}
					</span>
				</div>
			</div>

			{/* ===== CIEKAWOSTKA jako naklejka ===== */}
			{lore && (
				<div
					className={`-rotate-1 w-full rounded-2xl border-2 px-4 py-2 text-center text-sm font-bold leading-snug ${cardTheme.funFact}`}
				>
					💡 {lore.funFact}
				</div>
			)}

			{/* ===== PRZYJACIEL: wybór ulubieńca ===== */}
			{monsterId === companionId ? (
				<div className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-rose-50 px-4 py-3 text-lg font-extrabold text-rose-500">
					💛 To Twój przyjaciel
				</div>
			) : expedition?.monsterId === monsterId ? (
				/* podróżnik nie może teraz
				   zostać przyjacielem (guard w store jest źródłem prawdy;
				   łagodna linijka zamiast martwego przycisku) */
				<div className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-sky-50 px-4 py-3 text-lg font-extrabold text-sky-600">
					🎒 Wróci z wyprawy — wtedy możecie się zaprzyjaźnić!
				</div>
			) : (
				<div className="flex w-full items-center gap-2">
					<BigButton
						onClick={() => {
							setCompanion(monsterId)
							onClose()
						}}
						variant="secondary"
						className="flex-1 py-3 text-lg"
					>
						Zostań moim przyjacielem! 💛
					</BigButton>
					<HelpTip
						placement="top"
						align="right"
						text="Przyjaciel zamieszka na ekranie głównym i będzie Ci kibicował przy dobrych odpowiedziach. Możesz go zmienić, kiedy tylko chcesz."
					/>
				</div>
			)}

			{/* ===== GARDEROBA (zwijana) ===== */}
			<WardrobeSection monsterId={monsterId} />

			{/* ===== WYPRAWA (zwijana) ===== */}
			<ExpeditionSection monsterId={monsterId} onSent={onClose} />
		</div>
	)
}

// Karta NIEPOSIADANEGO potworka: sylwetka + „???” + plakietka rzadkości,
// znaczniki trybów ekskluzywnych i wybór wymarzonego. Ramka zawsze wg
// rzadkości (kosmetyki dotyczą tylko posiadanych).
function MonsterCardLocked({
	monsterId,
	onClose,
}: {
	monsterId: number
	onClose: () => void
}) {
	const dreamMonsterId = useGame((s) => s.dreamMonsterId)
	const setDreamMonster = useGame((s) => s.setDreamMonster)
	const monster = MONSTERS[monsterId]
	if (!monster) return null
	const cardTheme = CARD_THEME[monster.rarity]

	return (
		<div className={`${CARD_SHELL} ${cardTheme.card}`}>
			<MonsterSvg
				id={monsterId}
				size={180}
				animate={false}
				className="monster-silhouette"
			/>
			<div className="text-3xl font-extrabold text-slate-700">???</div>
			<div
				className={`rounded-full px-4 py-1 text-lg font-extrabold ${RARITY_META[monster.rarity].badge}`}
			>
				{RARITY_META[monster.rarity].label}
			</div>
			{isDivisionOnly(monsterId) && (
				<div className="rounded-full bg-violet-100 px-4 py-1 text-sm font-extrabold text-violet-600">
					➗ Tylko za dzielenie
				</div>
			)}
			{/* etykieta trybu luki */}
			{isGapOnly(monsterId) && (
				<div className="rounded-full bg-fuchsia-100 px-4 py-1 text-sm font-extrabold text-fuchsia-600">
					🧩 Tylko za zgadywanie liczby
				</div>
			)}
			{isPairsOnly(monsterId) && (
				<div className="rounded-full bg-sky-100 px-4 py-1 text-sm font-extrabold text-sky-600">
					{MODE_BADGES.pairs} Tylko za {MODE_NAMES.pairs}
				</div>
			)}
			{isFeedOnly(monsterId) && (
				<div className="rounded-full bg-rose-100 px-4 py-1 text-sm font-extrabold text-rose-600">
					{MODE_BADGES.feed} Tylko za {MODE_NAMES.feed}
				</div>
			)}
			{monsterId === dreamMonsterId ? (
				<BigButton
					onClick={() => {
						setDreamMonster(null)
						onClose()
					}}
					variant="secondary"
					className="w-full py-3 text-lg"
				>
					Już go nie chcę 💔
				</BigButton>
			) : (
				<div className="flex w-full items-center gap-2">
					<BigButton
						onClick={() => {
							setDreamMonster(monsterId)
							onClose()
						}}
						className="flex-1 py-3 text-lg"
					>
						To mój wymarzony potworek! 💖
					</BigButton>
					<HelpTip
						placement="top"
						align="right"
						text="Zaznacz potworka, o którym marzysz. Będzie na ciebie czekał — częściej będzie się wykluwał, a Jajko Życzeń (przy Fontannie w Wiosce) da ci dokładnie jego. Możesz mieć tylko jednego wymarzonego naraz."
					/>
				</div>
			)}
		</div>
	)
}

// Kafel listy jako memo: otwarcie karty zmienia stan CollectionScreen i bez
// tego przerenderowywało wszystkie 80 kafli (80 drzew SVG) przy każdym tapie.
// `content-visibility: auto`: kafle poza viewportem nie dostają stylów,
// layoutu ani malowania (na tablecie widać ~16 z 80) — na wrapperze z
// marginesem ujemnym, bo paint containment przycinałoby wystające badge'e
// (÷/🧩/✨, -6px) i ring wymarzonego.
const CollectionTile = memo(function CollectionTile({
	monster,
	owned,
	isDream,
	traveling,
	cosmetics,
	onSelect,
}: {
	monster: (typeof MONSTERS)[number]
	owned: boolean
	isDream: boolean
	traveling: boolean
	cosmetics: CosmeticsState
	onSelect: (id: number) => void
}) {
	// kafel nosi strój potworka (kapelusz/aura/ramka) STATYCZNIE —
	// 80 animowanych kafli to za dużo, a lista ma być spokojna.
	// Założona ramka podmienia rzadkościowy kolor krawędzi (świadoma
	// decyzja maintainera; anim-glow złotej ramki wycięty na kaflu).
	const equipped = owned ? equippedFor(cosmetics, monster.id) : {}
	const tileFrameId = equipped.frame
	const tileFrame =
		tileFrameId !== undefined
			? COSMETICS_BY_ID.get(tileFrameId)
					?.cardClasses?.replace("anim-glow", "")
					.trim()
			: undefined
	return (
		<div className="-m-2 p-2 [contain-intrinsic-size:auto_160px] [content-visibility:auto]">
			<button
				type="button"
				onClick={() => onSelect(monster.id)}
				className={`touch-manipulation relative flex w-full flex-col items-center rounded-2xl border-4 bg-white/80 p-2 shadow-sm transition-transform active:scale-95
					${tileFrame ?? RARITY_META[monster.rarity].border} ${isDream ? "ring-4 ring-amber-300" : ""}`}
			>
				{/* tło wypełnia cały kafel (nie okno z artem jak na karcie);
				    rounded-xl = rounded-2xl kafla minus border-4 */}
				{owned && (
					<EquippedBackground
						monsterId={monster.id}
						animate={false}
						className="rounded-xl"
					/>
				)}
				{traveling ? (
					// podróżnik: plecak zamiast sprite'a (reszta kafla bez zmian)
					<div className="relative flex aspect-square w-full items-center justify-center text-6xl">
						🎒
					</div>
				) : owned ? (
					<MonsterStage
						id={monster.id}
						size="100%"
						animate={false}
						wrapClassName="w-full"
					/>
				) : (
					<MonsterSvg
						id={monster.id}
						size="100%"
						animate={false}
						className="monster-silhouette"
					/>
				)}
				<div
					className={`relative mt-1 max-w-full truncate text-xs font-extrabold text-slate-600 ${
						equipped.background ? "rounded-full bg-white/85 px-2" : ""
					}`}
				>
					{owned ? monster.name : "???"}
				</div>
				{isDream && (
					<div className="anim-sparkle absolute -right-1.5 -top-1.5 text-xl">
						✨
					</div>
				)}
				{isDivisionOnly(monster.id) && (
					<div className="absolute -left-1.5 -top-1.5 rounded-full bg-violet-500 px-2 py-0.5 text-sm font-extrabold text-white shadow">
						÷
					</div>
				)}
				{isGapOnly(monster.id) && (
					<div className="absolute -left-1.5 -top-1.5 rounded-full bg-fuchsia-500 px-1.5 py-0.5 text-sm font-extrabold text-white shadow">
						🧩
					</div>
				)}
				{isPairsOnly(monster.id) && (
					<div className="absolute -left-1.5 -top-1.5 rounded-full bg-sky-500 px-2 py-0.5 text-sm font-extrabold text-white shadow">
						{MODE_BADGES.pairs}
					</div>
				)}
				{isFeedOnly(monster.id) && (
					<div className="absolute -left-1.5 -top-1.5 rounded-full bg-rose-500 px-2 py-0.5 text-sm font-extrabold text-white shadow">
						{MODE_BADGES.feed}
					</div>
				)}
			</button>
		</div>
	)
})

export function CollectionScreen() {
	const ownedMonsters = useGame((s) => s.ownedMonsters)
	const dreamMonsterId = useGame((s) => s.dreamMonsterId)
	const iskierki = useGame((s) => s.iskierki)
	const buyWishEgg = useGame((s) => s.buyWishEgg)
	const goTo = useGame((s) => s.goTo)
	const cosmetics = useGame((s) => s.cosmetics)
	const village = useGame((s) => s.village)
	// cena Jajka Życzeń rośnie z każdym kupionym (licznik w achievementStats)
	const achievementStats = useGame((s) => s.achievementStats)
	const expedition = useGame((s) => s.expedition)
	const [selectedId, setSelectedId] = useState<number | null>(null)

	const ownedCount = collectionCount(ownedMonsters)
	// studnia życzeń: bez fontanny przycisk kupna ustępuje zajawce (fontanna →
	// Wioska); guard w store czyta ten sam obiekt
	const wish = wishEgg({
		dreamMonsterId,
		ownedMonsters,
		achievementStats,
		village,
	})
	const selected = selectedId !== null ? MONSTERS[selectedId] : undefined
	const selectedOwned =
		selectedId !== null ? ownedMonsters[selectedId] : undefined

	return (
		<div className="flex min-h-[var(--app-vh)] flex-col gap-4 p-4">
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={() => goTo("home")}
					className="touch-manipulation rounded-full bg-white/80 px-5 py-2 text-2xl font-extrabold text-grape-dark shadow active:scale-90"
					aria-label="Wróć do domku"
				>
					←
				</button>
				<div className="text-2xl font-extrabold text-grape-dark">
					Moje Potworki {ownedCount}/{MONSTER_COUNT}
				</div>
				<div className="flex items-center gap-1.5">
					<HelpTip
						placement="bottom"
						align="right"
						text="To twoje iskierki ✨. Dostajesz je, gdy z jajka wykluje się potworek, którego już masz. Uzbieraj ich dość, a przy Fontannie kupisz Jajko Życzeń!"
					/>
					<div className="rounded-full bg-white/80 px-4 py-2 text-lg font-extrabold text-amber-500 shadow">
						✨ {iskierki}
					</div>
				</div>
			</div>

			{/* Jedno rusztowanie dla stanów studni życzeń. Zajawka fontanny
			    (aspiracja jak zablokowane półki Sklepiku, nigdy ton błędu) NIE
			    zależy od portfela — to jedyne miejsce tłumaczące związek
			    Fontanna→Jajko Życzeń. JEDYNY powód wyszarzenia to komplet
			    nielegendarnych (decyzja maintainera 2026-09-06): brak iskierek
			    nie gasi przycisku (cena stoi w etykiecie, tap = cichy no-op w store). */}
			<div className="mx-auto flex w-full max-w-sm items-center gap-2">
				<BigButton
					onClick={wish.unlocked ? buyWishEgg : () => goTo("village")}
					variant="secondary"
					disabled={!wish.available}
					className={`flex-1 py-3 ${wish.unlocked ? "text-xl" : "text-lg"}`}
				>
					{!wish.available ? (
						"Jajko Życzeń 🌟 — masz już wszystkie potworki poza legendarnymi!"
					) : wish.unlocked ? (
						<>
							Jajko Życzeń 🌟 — {wish.cost} ✨
							{wish.dreamApplies && " (wymarzony!)"}
						</>
					) : (
						"Jajko Życzeń 🌟 — zbuduj Fontannę! ⛲"
					)}
				</BigButton>
				<HelpTip
					placement="bottom"
					align="right"
					text={
						wish.unlocked
							? "Kupujesz je za iskierki ✨. Masz wymarzonego potworka? Dostaniesz dokładnie jego — na pewno! Nie masz? Wykluje się jakiś nowy potworek, którego jeszcze nie masz. Uwaga: legendarnych potworków Jajko Życzeń nie wykluwa — te zdobywasz tylko z jajek za rundy. (Sam wymarzony jest za darmo i tylko sprawia, że zwykłe jajka częściej wykluwają właśnie jego.)"
							: "Jajko Życzeń kupisz przy Fontannie: wrzucasz iskierki ✨ i wypowiadasz życzenie. Zbuduj Fontannę w Wiosce, a studnia życzeń ruszy!"
					}
				/>
			</div>

			<div className="grid grid-cols-3 gap-3 pb-6 min-[420px]:grid-cols-4">
				{SORTED_MONSTERS.map((monster) => (
					<CollectionTile
						key={monster.id}
						monster={monster}
						owned={monster.id in ownedMonsters}
						isDream={monster.id === dreamMonsterId}
						traveling={monster.id === expedition?.monsterId}
						cosmetics={cosmetics}
						onSelect={setSelectedId}
					/>
				))}
			</div>

			{selected && (
				<CardModal
					onClose={() => setSelectedId(null)}
					closeLabel="Zamknij kartę"
				>
					{selectedOwned ? (
						<MonsterCard
							monsterId={selected.id}
							onClose={() => setSelectedId(null)}
						/>
					) : (
						<MonsterCardLocked
							monsterId={selected.id}
							onClose={() => setSelectedId(null)}
						/>
					)}
				</CardModal>
			)}
		</div>
	)
}

import { memo, useState } from "react"
import { BigButton } from "../components/BigButton"
import { CardModal } from "../components/CardModal"
import { CatalogHeader } from "../components/CatalogHeader"
import { CosmeticArt, EquippedBackground } from "../components/CosmeticArt"
import { CreatureCardArt } from "../components/CreatureCardArt"
import { ExpeditionDetails } from "../components/ExpeditionDetails"
import { HelpTip } from "../components/HelpTip"
import { HomeArt } from "../components/HomeArt"
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
	isMemoryOnly,
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

// The wardrobe stays collapsed initially so the passport remains a character
// card. Its live preview keeps outfit changes visible while browsing items.
function WardrobeSection({ monsterId }: { monsterId: number }) {
	const cosmetics = useGame((s) => s.cosmetics)
	const equipCosmetic = useGame((s) => s.equipCosmetic)
	const goTo = useGame((s) => s.goTo)
	const [open, setOpen] = useState(false)
	const [slot, setSlot] = useState<CosmeticSlot>(
		() => COSMETICS.find((item) => isOwned(cosmetics, item.id))?.slot ?? "hat",
	)
	const eq = equippedFor(cosmetics, monsterId)
	const ownedItems = COSMETICS.filter((c) => isOwned(cosmetics, c.id))
	const slots: { slot: CosmeticSlot; label: string }[] = [
		{ slot: "hat", label: "Kapelusze" },
		{ slot: "aura", label: "Aury" },
		{ slot: "background", label: "Tła" },
		{ slot: "frame", label: "Ramka" },
	]
	const items = ownedItems.filter((c) => c.slot === slot)
	return (
		<div className="creature-detail-section creature-detail-wardrobe">
			<button
				type="button"
				aria-expanded={open}
				onClick={() => setOpen((o) => !o)}
				className="creature-activity-toggle"
			>
				<CreatureCardArt kind="wardrobe" />
				<span className="creature-activity-copy">
					<strong>Ubierz 🎩</strong>
					<span>Przymierz coś wyjątkowego</span>
				</span>
				<span className="creature-activity-arrow" aria-hidden="true">
					{open ? "−" : "+"}
				</span>
			</button>
			{open && (
				<div className="creature-wardrobe-content">
					<div className="creature-outfit-preview">
						<EquippedBackground monsterId={monsterId} className="" />
						<MonsterStage id={monsterId} size={112} animate={false} />
					</div>
					<div
						className="creature-wardrobe-tabs"
						role="group"
						aria-label="Rodzaj stroju"
					>
						{slots.map((tab) => (
							<button
								type="button"
								key={tab.slot}
								className="creature-wardrobe-tab"
								aria-pressed={slot === tab.slot}
								onClick={() => setSlot(tab.slot)}
							>
								{tab.label}
							</button>
						))}
					</div>
					<div className="creature-wardrobe-items">
						<button
							type="button"
							aria-pressed={eq[slot] === undefined}
							onClick={() => equipCosmetic(monsterId, slot, null)}
							className="creature-wardrobe-item"
						>
							<span className="creature-wardrobe-none" aria-hidden="true">
								∅
							</span>
							<span>{slot === "frame" ? "Bez ramki" : "Zdejmij"}</span>
						</button>
						{items.map((item) => (
							<button
								type="button"
								key={item.id}
								aria-pressed={eq[slot] === item.id}
								onClick={() => equipCosmetic(monsterId, slot, item.id)}
								className="creature-wardrobe-item"
							>
								{slot === "frame" ? (
									<span
										className={`creature-frame-swatch border-4 ${item.cardClasses ?? ""}`}
									>
										{item.cornerEmoji ?? "✦"}
									</span>
								) : (
									<CosmeticArt id={item.id} size={48} />
								)}
								<span>{item.name}</span>
							</button>
						))}
					</div>
					{items.length === 0 && (
						<div className="creature-wardrobe-empty">
							<p>Tu jeszcze nie ma ozdób.</p>
							<button
								className="creature-shop-link"
								type="button"
								onClick={() => goTo("village")}
							>
								Sklepik w Wiosce →
							</button>
						</div>
					)}
				</div>
			)}
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
		<div className="creature-detail-section creature-detail-expedition">
			<div className="creature-expedition-heading creature-help-anchor">
				<button
					type="button"
					aria-expanded={open}
					onClick={() => setOpen((o) => !o)}
					className="creature-activity-toggle"
				>
					<CreatureCardArt kind="expedition" />
					<span className="creature-activity-copy">
						<strong>Wyprawa 🎒</strong>
						<span>
							{progress
								? `${progress.done}/${progress.total} rund`
								: "Mała podróż, wielkie odkrycia"}
						</span>
					</span>
					<span className="creature-activity-arrow" aria-hidden="true">
						{open ? "−" : "+"}
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
									<span className="creature-route-heading">
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
							const rowClass = "creature-expedition-route"
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
		<div
			className={`creature-detail scrollbar-none border-4 ${frameDef?.cardClasses ?? cardTheme.card}`}
			role="dialog"
			aria-modal="true"
			aria-labelledby="creature-detail-title"
		>
			{/* ===== OKNO Z ARTEM — bohater karty ===== */}
			<div className="creature-detail-hero">
				<CreatureCardArt kind="habitat" />
				<CreatureCardArt kind="portrait" />
				{/* założone tło wypełnia całe okno z artem (okno ma overflow-hidden
				    i jest przycięte ramką karty) */}
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
					className={`creature-detail-ribbon ${RARITY_META[monster.rarity].badge}`}
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
				{isMemoryOnly(monsterId) && (
					<div className="absolute top-2 left-2 z-10 rounded-full bg-teal-500 px-2.5 py-1 text-sm font-extrabold text-white shadow">
						{MODE_BADGES.memory}
					</div>
				)}
				<div className="creature-detail-stage relative flex justify-center">
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

			<div className="creature-detail-body">
				{/* ===== BANER: NAZWA + GATUNEK ===== */}
				<div className="creature-detail-heading">
					<h2 id="creature-detail-title">{monster.name}</h2>
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
				{lore && <p className="creature-detail-description">{lore.blurb}</p>}

				{/* ===== MINI-STATY: kraina pochodzenia + data poznania ===== */}
				<div className="creature-detail-stats">
					{origin && (
						<div className="creature-detail-stat">
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
					<div className="creature-detail-stat">
						<span className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-400">
							Poznany
						</span>
						<span className="creature-detail-date">
							{new Date(owned.hatchedAt).toLocaleDateString("pl-PL")}
						</span>
					</div>
				</div>

				{/* ===== CIEKAWOSTKA jako naklejka ===== */}
				{lore && <div className="creature-detail-fact">💡 {lore.funFact}</div>}

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
					<div className="creature-help-anchor w-full">
						<BigButton
							onClick={() => {
								setCompanion(monsterId)
								onClose()
							}}
							variant="secondary"
							className="creature-detail-primary w-full"
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
		<div
			className={`creature-detail scrollbar-none border-4 ${cardTheme.card}`}
			role="dialog"
			aria-modal="true"
			aria-labelledby="creature-detail-title"
		>
			<div className="creature-detail-hero creature-detail-mystery">
				<CreatureCardArt kind="habitat" />
				<CreatureCardArt kind="portrait" />
				<MonsterSvg
					id={monsterId}
					size={180}
					animate={false}
					className="monster-silhouette"
				/>

				<div
					className={`creature-detail-ribbon ${RARITY_META[monster.rarity].badge}`}
				>
					{RARITY_META[monster.rarity].label}
				</div>
			</div>
			<div className="creature-detail-body">
				<div className="creature-detail-heading">
					<h2 id="creature-detail-title">???</h2>
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
				{isMemoryOnly(monsterId) && (
					<div className="rounded-full bg-teal-100 px-4 py-1 text-sm font-extrabold text-teal-600">
						{MODE_BADGES.memory} Tylko za {MODE_NAMES.memory}
					</div>
				)}
				{monsterId === dreamMonsterId ? (
					<BigButton
						onClick={() => {
							setDreamMonster(null)
							onClose()
						}}
						variant="secondary"
						className="creature-detail-secondary w-full"
					>
						Już go nie chcę 💔
					</BigButton>
				) : (
					<div className="creature-help-anchor w-full">
						<BigButton
							onClick={() => {
								setDreamMonster(monsterId)
								onClose()
							}}
							className="creature-detail-primary w-full"
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
		<div className="collection-tile-slot">
			<button
				type="button"
				onClick={() => onSelect(monster.id)}
				className={`collection-tile border-2 ${tileFrame ?? RARITY_META[monster.rarity].border} ${isDream ? "ring-4 ring-amber-300" : ""}`}
				data-owned={owned}
				aria-label={`${owned ? monster.name : "???"}, ${RARITY_META[monster.rarity].label}${isDream ? ", wymarzony" : ""}${traveling ? ", na wyprawie" : ""}`}
			>
				{/* tło wypełnia cały kafel (nie okno z artem jak na karcie);
				    zaokrąglenie tła uwzględnia obramowanie kafla */}
				{owned && (
					<EquippedBackground
						monsterId={monster.id}
						animate={false}
						className="collection-tile-background"
					/>
				)}
				<div className="collection-tile-art">
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
				</div>
				<div
					className={`collection-tile-name ${equipped.background ? "collection-name-backed" : ""}`}
				>
					{owned ? monster.name : "???"}
				</div>
				<span
					className={`collection-tile-rarity ${RARITY_META[monster.rarity].badge}`}
				>
					{RARITY_META[monster.rarity].label}
				</span>
				{isDream && <div className="collection-dream">✨</div>}
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
				{isMemoryOnly(monster.id) && (
					<div className="absolute -left-1.5 -top-1.5 rounded-full bg-teal-500 px-2 py-0.5 text-sm font-extrabold text-white shadow">
						{MODE_BADGES.memory}
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

	const [filter, setFilter] = useState<"all" | "owned" | "locked">("all")
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

	const visibleMonsters = SORTED_MONSTERS.filter(
		(monster) =>
			filter === "all" ||
			(filter === "owned"
				? monster.id in ownedMonsters
				: !(monster.id in ownedMonsters)),
	)
	const filters = [
		{ id: "all", label: "Wszystkie", count: MONSTER_COUNT },
		{ id: "owned", label: "Poznane", count: ownedCount },
		{ id: "locked", label: "Do odkrycia", count: MONSTER_COUNT - ownedCount },
	] as const
	return (
		<main className="catalog-screen collection-screen">
			<CatalogHeader title="Moje Potworki" onBack={() => goTo("home")}>
				<div className="catalog-wallet collection-wallet">
					<span>✨ {iskierki}</span>
				</div>
			</CatalogHeader>
			<div className="collection-overview">
				<section className="catalog-hero" aria-label="Postęp kolekcji">
					<div className="catalog-art" aria-hidden="true">
						<HomeArt kind="collection" />
					</div>
					<div className="catalog-summary">
						<h2>
							Poznane
							<strong>
								{ownedCount}
								<span>/{MONSTER_COUNT}</span>
							</strong>
						</h2>
						<progress
							className="catalog-total-progress"
							value={ownedCount}
							max={MONSTER_COUNT}
							aria-label="Poznane potworki"
						/>
						<p>
							{ownedCount === MONSTER_COUNT
								? "Cała kolekcja jest Twoja!"
								: "Każde jajko to nowa znajomość."}
						</p>
					</div>

					{/* Jedno rusztowanie dla stanów studni życzeń. Zajawka fontanny
			    (aspiracja jak zablokowane półki Sklepiku, nigdy ton błędu) NIE
			    zależy od portfela — to jedyne miejsce tłumaczące związek
			    Fontanna→Jajko Życzeń. Dwa powody wyszarzenia (decyzja maintainera
			    2026-09-06): komplet nielegendarnych (własna etykieta) albo za mało
			    iskierek na cenę z etykiety. */}
					<div className="collection-wish">
						<BigButton
							onClick={wish.unlocked ? buyWishEgg : () => goTo("village")}
							variant="secondary"
							disabled={
								!wish.available || (wish.unlocked && iskierki < wish.cost)
							}
							className="collection-wish-button"
						>
							{!wish.available ? (
								"Jajko Życzeń — masz już wszystkie potworki poza legendarnymi!"
							) : wish.unlocked ? (
								<>
									Jajko Życzeń — {wish.cost} ✨
									{wish.dreamApplies && " (wymarzony!)"}
								</>
							) : (
								"Jajko Życzeń — zbuduj Fontannę! ⛲"
							)}
						</BigButton>
						<div className="collection-corner-help">
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
					</div>
				</section>
			</div>
			<div
				className="catalog-filters collection-filters"
				role="group"
				aria-label="Filtruj potworki"
			>
				{filters.map(({ id, label, count }) => (
					<button
						type="button"
						key={id}
						className="catalog-filter"
						aria-pressed={filter === id}
						onClick={() => setFilter(id)}
					>
						{label}
						<span>{count}</span>
					</button>
				))}
			</div>
			{visibleMonsters.length === 0 && (
				<div className="catalog-empty" role="status">
					<HomeArt kind="collection" />
					<p>
						{filter === "owned"
							? "Twoje potworki pojawią się tutaj po wykluciu."
							: "Cała kolekcja jest Twoja!"}
					</p>
					<button
						type="button"
						className="catalog-empty-button"
						onClick={() => setFilter("all")}
					>
						Wszystkie
					</button>
				</div>
			)}
			<div className="collection-grid">
				{visibleMonsters.map((monster) => (
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
					wrapperClassName="creature-modal"
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
		</main>
	)
}

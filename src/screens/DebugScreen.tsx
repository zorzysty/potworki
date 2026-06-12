import { RARITY_META } from "../components/rarity"
import { ALL_FACTS } from "../game/facts"
import { MONSTERS } from "../monsters/catalog"
import { MonsterSvg } from "../monsters/MonsterSvg"
import { useGame } from "../store/store"

export function DebugScreen() {
	const facts = useGame(s => s.facts)
	const iskierki = useGame(s => s.iskierki)
	const unlockedStage = useGame(s => s.unlockedStage)
	const totalRounds = useGame(s => s.totalRounds)
	const goTo = useGame(s => s.goTo)
	const debugSetAllMastery = useGame(s => s.debugSetAllMastery)
	const debugOwnRarity = useGame(s => s.debugOwnRarity)
	const debugAddIskierki = useGame(s => s.debugAddIskierki)
	const debugAddEgg = useGame(s => s.debugAddEgg)
	const debugReset = useGame(s => s.debugReset)

	const btn = "rounded-lg bg-white px-3 py-1.5 text-sm font-bold text-slate-700 shadow active:scale-95"

	return (
		<div className="min-h-dvh select-text p-4 text-sm">
			<button type="button" onPointerDown={() => goTo("home")} className={btn}>
				← Home
			</button>
			<div className="my-2 font-bold">
				etap: {unlockedStage} | rundy: {totalRounds} | iskierki: {iskierki}
			</div>
			<div className="flex flex-wrap gap-2 pb-4">
				<button type="button" className={btn} onPointerDown={() => debugSetAllMastery(0.7)}>
					mastery 0.7
				</button>
				<button type="button" className={btn} onPointerDown={() => debugSetAllMastery(0)}>
					mastery 0
				</button>
				<button type="button" className={btn} onPointerDown={() => debugOwnRarity("common")}>
					own commons
				</button>
				<button type="button" className={btn} onPointerDown={() => debugAddIskierki(10)}>
					+10 ✨
				</button>
				<button type="button" className={btn} onPointerDown={() => debugAddEgg("normal")}>
					+jajko zwykłe
				</button>
				<button type="button" className={btn} onPointerDown={() => debugAddEgg("rainbow")}>
					+jajko tęczowe
				</button>
				<button
					type="button"
					className={`${btn} text-red-600`}
					onPointerDown={() => {
						if (window.confirm("Na pewno skasować cały zapis?")) debugReset()
					}}
				>
					RESET
				</button>
			</div>

			<details open>
				<summary className="cursor-pointer text-lg font-extrabold">Mastery (55 działań)</summary>
				<table className="mt-2 w-full max-w-md">
					<thead>
						<tr className="text-left font-bold text-slate-500">
							<th>fakt</th>
							<th>próby</th>
							<th>dobre</th>
							<th>seria</th>
							<th>mastery</th>
						</tr>
					</thead>
					<tbody>
						{ALL_FACTS.map(fact => {
							const stats = facts[fact.key]
							return (
								<tr key={fact.key} className="border-t border-white/50">
									<td className="font-bold">
										{fact.a}×{fact.b}
									</td>
									<td>{stats?.attempts ?? 0}</td>
									<td>{stats?.correct ?? 0}</td>
									<td>{stats?.streak ?? 0}</td>
									<td>{stats ? stats.mastery.toFixed(2) : "—"}</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</details>

			<details open className="mt-4">
				<summary className="cursor-pointer text-lg font-extrabold">Galeria (48)</summary>
				<div className="mt-2 grid grid-cols-4 gap-2 md:grid-cols-6">
					{MONSTERS.map(monster => (
						<div
							key={monster.id}
							className={`flex flex-col items-center rounded-xl border-2 bg-white/70 p-1 ${RARITY_META[monster.rarity].border}`}
						>
							<MonsterSvg id={monster.id} size="100%" animate={false} />
							<div className="text-[10px] font-bold">
								#{monster.id} {monster.name}
							</div>
						</div>
					))}
				</div>
			</details>
		</div>
	)
}

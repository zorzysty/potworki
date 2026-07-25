import type { VillageGoal } from "../game/village"

// Pasek celu budowy: nazwa (+⭐ gdy to cel wybrany przez dziecko) + pasek
// postępu + x/y. Czysto prezentacyjny — caller daje goal/iskierki/goalId i
// własny wrapper (button z nawigacją); separator i prefiks „Cel: " to sprawa
// callera. Współdzielą go nagłówek Wioski i chip żołdu w podsumowaniu rundy,
// więc nowe stany postępu celu dopisujemy TU (obie powierzchnie razem) —
// z „czy to cel dziecka" włącznie: caller podaje surowe `village.goalId`,
// porównanie żyje w jednym miejscu.
export function GoalProgressBar({
	goal,
	iskierki,
	goalId,
	prefix,
}: {
	goal: VillageGoal
	iskierki: number
	goalId: string | null
	prefix?: string
}) {
	const starred = goalId === goal.id
	return (
		<>
			<span className="truncate text-sm font-extrabold text-grape-dark">
				{prefix}
				{goal.name}
				{starred && " ⭐"}
			</span>
			<span className="h-2 min-w-8 flex-1 overflow-hidden rounded-full bg-slate-200">
				<span
					className="block h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-400 transition-[width]"
					style={{
						width: `${Math.min(100, (iskierki / goal.cost) * 100)}%`,
					}}
				/>
			</span>
			<span className="whitespace-nowrap text-sm font-extrabold text-amber-500">
				{Math.min(iskierki, goal.cost)}/{goal.cost}
			</span>
		</>
	)
}

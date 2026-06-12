import { MAX_STARS_PER_ROUND } from "../game/facts"
import { HelpTip } from "./HelpTip"

export function StarMeter({ stars }: { stars: number }) {
	const pct = Math.min(100, (stars / MAX_STARS_PER_ROUND) * 100)
	return (
		<div className="flex w-full items-center gap-2">
			<div className="h-5 flex-1 overflow-hidden rounded-full bg-white/60 shadow-inner">
				<div
					className={`h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500 transition-all duration-500 ${pct > 0 ? "anim-glow" : ""}`}
					style={{ width: `${pct}%` }}
				/>
			</div>
			<div className="min-w-14 text-right text-lg font-extrabold text-amber-500">
				{stars} <span className="anim-sparkle inline-block">⭐</span>
			</div>
			<HelpTip
				placement="bottom"
				align="right"
				text="Za każdą dobrą odpowiedź zbierasz gwiazdki — im szybciej odpowiesz, tym więcej! Bez gwiazdek też przejdziesz dalej, ale im więcej ich uzbierasz, tym ładniejsze jajko dostaniesz."
			/>
		</div>
	)
}

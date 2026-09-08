import { MAX_STARS_PER_ROUND } from "../game/facts"

export function StarMeter({ stars }: { stars: number }) {
	const pct = Math.min(100, (stars / MAX_STARS_PER_ROUND) * 100)
	return (
		<div className="star-meter">
			<div
				className="star-meter-track"
				role="progressbar"
				aria-label="Gwiazdki"
				aria-valuenow={stars}
				aria-valuemin={0}
				aria-valuemax={MAX_STARS_PER_ROUND}
			>
				<div className="star-meter-fill" style={{ width: `${pct}%` }} />
			</div>
			<div className="star-meter-count">
				{stars} <span className="inline-block">⭐</span>
			</div>
		</div>
	)
}

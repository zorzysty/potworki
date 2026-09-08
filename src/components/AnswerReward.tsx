interface Props {
	stars: number
	fallback?: string
}

export function AnswerReward({ stars, fallback = "Dobrze! 💪" }: Props) {
	return (
		<div className="play-success anim-pop">
			{stars > 0 ? `+${stars} ⭐` : fallback}
		</div>
	)
}

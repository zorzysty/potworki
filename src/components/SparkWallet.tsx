// Static spark counter pill (Achievements keeps its own animated variant of the same markup).
export function SparkWallet({ iskierki }: { iskierki: number }) {
	return (
		<div className="catalog-wallet">
			<span>✨ {iskierki}</span>
		</div>
	)
}

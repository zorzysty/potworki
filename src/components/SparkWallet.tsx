// Static spark counter pill (Achievements keeps its own animated variant of the same markup).
// Odmiana „iskierek" po liczbie (biernik: 1 iskierkę, 2–4 iskierki, 5+ iskierek).
export function iskierkiWord(n: number): string {
	if (n === 1) return "iskierkę"
	const d = n % 10
	const h = n % 100
	return d >= 2 && d <= 4 && (h < 12 || h > 14) ? "iskierki" : "iskierek"
}

export function SparkWallet({ iskierki }: { iskierki: number }) {
	return (
		<div className="catalog-wallet">
			<span>✨ {iskierki}</span>
		</div>
	)
}

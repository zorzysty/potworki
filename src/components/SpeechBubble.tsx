// Dymek przyjaciela — krótki tekst po polsku, wjeżdża z `anim-pop-in`. Czysto
// prezentacyjny: rodzic decyduje KIEDY go pokazać (montaż/odmontowanie) i GDZIE
// (owija w pozycjonowany absolutnie kontener — sam dymek animuje własny transform,
// więc nie centrujemy go transformem rodzica, żeby się nie biły).
export function SpeechBubble({ text }: { text: string }) {
	return (
		<div className="anim-pop-in relative max-w-[12rem] rounded-2xl bg-white px-3 py-1.5 text-center text-sm font-extrabold leading-snug text-grape-dark shadow-lg ring-2 ring-grape/10">
			{text}
			{/* ogonek dymka */}
			<span className="absolute -bottom-1 left-1/2 -ml-1.5 h-3 w-3 rotate-45 rounded-sm bg-white" />
		</div>
	)
}

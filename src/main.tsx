import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./App"
import "./styles.css"

// Realnie widoczna wysokość viewportu → --vvh. Firefox na Androidzie trzyma
// layout w rozmiarze „z ukrytym paskiem narzędzi" (bugzilla 1586144), więc
// jednostkom viewportu (dvh, bywa że i svh) nie można tam ufać — ekrany
// o min-h w tych jednostkach wystawały pod pasek (keypad rundy poza ekranem).
// visualViewport.height mierzy prawdę w każdej przeglądarce; styles.css bierze
// min(100svh, --vvh) do --app-vh. Pomiar pomijamy przy pinch-zoomie
// (scale > 1 zmniejsza visualViewport, a layout ma wtedy stać w miejscu).
const vv = window.visualViewport
if (vv) {
	// --vvh napędza --app-vh, więc każdy zapis unieważnia layout CAŁEGO
	// dokumentu — a resize strzela seriami z tą samą zaokrągloną wartością
	// podczas animacji paska; identyczne wartości odfiltrowujemy
	let lastVvh = ""
	const apply = () => {
		if (vv.scale > 1.05) return
		const h = `${Math.round(vv.height)}px`
		if (h === lastVvh) return
		lastVvh = h
		document.documentElement.style.setProperty("--vvh", h)
	}
	apply()
	vv.addEventListener("resize", apply)
}

createRoot(document.getElementById("root") as HTMLElement).render(
	<StrictMode>
		<App />
	</StrictMode>,
)

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig({
	base: "/potworki/",
	plugins: [
		react(),
		tailwindcss(),
		VitePWA({
			// autoUpdate: nowy deploy → SW instaluje się w tle przy pierwszym
			// ONLINE uruchomieniu i natychmiast przejmuje (skipWaiting+clientsClaim),
			// więc dziecko nigdy nie zostaje przypięte do starego builda. Zapis w
			// localStorage jest poza zasięgiem SW — aktualizacja niczego w nim nie
			// rusza, a migracje SAVE_VERSION i tak biegną przy załadowaniu appki.
			registerType: "autoUpdate",
			injectRegister: "auto", // rejestracja wstrzyknięta w build — zero zmian w src/
			includeAssets: ["favicon.svg", "apple-touch-icon.png"],
			manifest: {
				// PROPOZYCJE do dopracowania (nazwy widoczne przy instalacji)
				name: "Potworki",
				short_name: "Potworki",
				description: "Zbieraj potworki, ćwicząc mnożenie i dzielenie!",
				lang: "pl",
				// GH Pages subpath — scope i start_url MUSZĄ siedzieć pod /potworki/
				scope: "/potworki/",
				start_url: "/potworki/",
				display: "standalone",
				orientation: "any",
				theme_color: "#7c5cf0", // --color-grape (zgodnie z meta w index.html)
				background_color: "#f5f3ff", // jasny fiolet splash (PROPOZYCJA)
				icons: [
					{ src: "pwa-192.png", sizes: "192x192", type: "image/png" },
					{ src: "pwa-512.png", sizes: "512x512", type: "image/png" },
					{
						src: "pwa-maskable-512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
				],
			},
			workbox: {
				// precache CAŁEGO builda — appka jest mała i statyczna; woff2 = font offline
				globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
				// stare precache znikają przy aktualizacji (spójność z SAVE_VERSION:
				// nigdy mieszanki starych i nowych chunków)
				cleanupOutdatedCaches: true,
				// SPA bez routera URL-owego, ale standalone start musi trafić w index
				navigateFallback: "/potworki/index.html",
			},
			// dev z HMR bez SW — zero konfliktów z vite dev serverem
			devOptions: { enabled: false },
		}),
	],
})

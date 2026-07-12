// Generator ikon PWA z public/favicon.svg — deterministyczny i re-runnable:
// uruchom ręcznie po każdej zmianie favicon.svg, wygenerowane PNG commitujemy
// (zero zależności przeglądarkowych w CI).
//
// puppeteer-core celowo NIE jest zależnością repo (potrzebny tylko tutaj).
// Wskaż dowolną istniejącą instalację przez zmienną PUPPETEER_CORE, np.:
//   mkdir -p /tmp/pptr && (cd /tmp/pptr && bun add puppeteer-core)
//   PUPPETEER_CORE=/tmp/pptr/node_modules/puppeteer-core bun scripts/make-icons.ts
// Chromium wg przepisu z root CLAUDE.md (sekcja „Testowanie w przeglądarce"):
// /usr/bin/chromium z --no-sandbox --disable-gpu.

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const puppeteerPkg = process.env.PUPPETEER_CORE ?? "puppeteer-core"
const { default: puppeteer } = await import(puppeteerPkg)

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const publicDir = join(root, "public")
const svg = readFileSync(join(publicDir, "favicon.svg"), "utf8")
const svgUri = `data:image/svg+xml,${encodeURIComponent(svg)}`

// scale = udział ikony w kanwie; bg = kolor tła (brak → przezroczyste).
// Maskable: OS przycina do 10% z każdej krawędzi (safe zone) → ikona na 80%
// pełnowymiarowego, jednolitego tła --color-grape. apple-touch: iOS nie dodaje
// żadnego paddingu, pełne tło unika białego talerza.
const GRAPE = "#7c5cf0"
const targets: {
	file: string
	size: number
	scale: number
	bg?: string
}[] = [
	{ file: "pwa-192.png", size: 192, scale: 1 },
	{ file: "pwa-512.png", size: 512, scale: 1 },
	{ file: "pwa-maskable-512.png", size: 512, scale: 0.8, bg: GRAPE },
	{ file: "apple-touch-icon.png", size: 180, scale: 0.84, bg: GRAPE },
]

const browser = await puppeteer.launch({
	executablePath: "/usr/bin/chromium",
	args: ["--no-sandbox", "--disable-gpu"],
})
const page = await browser.newPage()

for (const { file, size, scale, bg } of targets) {
	await page.setViewport({ width: size, height: size, deviceScaleFactor: 1 })
	const html = `<!doctype html><html><head><style>
		html,body{margin:0;width:100%;height:100%;background:${bg ?? "transparent"};
			display:flex;align-items:center;justify-content:center;overflow:hidden}
		img{width:${scale * 100}%;height:${scale * 100}%}
	</style></head><body><img src="${svgUri}"></body></html>`
	await page.goto(`data:text/html,${encodeURIComponent(html)}`, {
		waitUntil: "networkidle0",
	})
	await page.screenshot({
		path: join(publicDir, file),
		omitBackground: bg === undefined,
	})
	console.log(`✓ public/${file} (${size}×${size})`)
}

await browser.close()

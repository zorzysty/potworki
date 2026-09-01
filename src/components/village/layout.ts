import type { BuildingId } from "../../game/village"

// Układ działek wioski liczony z ROZMIARU SCENY (px), nie ze stałych
// procentów — 7 budynków ma się mieścić bez nakładania i na laptopie,
// i na telefonie. ZAWSZE dwa rzędy z przesunięciem (decyzja maintainera:
// nigdy jeden rząd, nawet na szerokim ekranie): przedni (niskie, szerokie)
// na linii gruntu, tylny (wysokie: sklepik, zamek, latarnie) uniesiony
// o WIĘCEJ niż najwyższy budynek z przodu — rzędy mogą dzielić oś X bez
// zakrywania. Skala artu maleje z szerokością, ale przycisk działki ma
// min 64 px niezależnie od artu. Sufit z wysokości sceny pilnuje, żeby
// zamek nie wystawał ponad niebo.
// Czysta funkcja — test `layout.test.ts` sprawdza brak przecięć prostokątów.

export interface Plot {
	left: number // px od lewej krawędzi sceny
	width: number // px
	height: number // px (z proporcji viewBoxu artu)
	dy: number // uniesienie stopy nad linią gruntu, px
	z: number
	row: "front" | "back"
}

// bazowe szerokości (px przy skali 1) i proporcje h/w z viewBoxów artów
const BASE: Record<BuildingId, { w: number; ratio: number; row: Plot["row"] }> =
	{
		domki: { w: 150, ratio: 100 / 170, row: "front" },
		"plac-zabaw": { w: 160, ratio: 104 / 170, row: "front" },
		fontanna: { w: 130, ratio: 100 / 120, row: "front" },
		ogrodek: { w: 120, ratio: 80 / 110, row: "front" },
		sklepik: { w: 110, ratio: 116 / 150, row: "back" },
		zamek: { w: 240, ratio: 192 / 190, row: "back" },
		latarnie: { w: 100, ratio: 100 / 116, row: "back" },
	}
const GAP = 8
const MAX_SCALE = 1.05
// wierzchołek zamku nie wyżej niż ~10% sceny: linia gruntu jest na 47%,
// więc do dyspozycji jest 0.42 wysokości
const SKY_ROOM = 0.42

const h = (id: BuildingId, w: number) => w * BASE[id].ratio

function place(
	id: BuildingId,
	left: number,
	width: number,
	dy: number,
	z: number,
): Plot {
	return { left, width, height: h(id, width), dy, z, row: BASE[id].row }
}

export function layoutPlots(
	sceneW: number,
	sceneH: number,
): Record<BuildingId, Plot> {
	const skyRoom = SKY_ROOM * sceneH
	// przód: [domki, plac] | korytarz drogi | [fontanna, ogródek]; tył:
	// sklepik | zamek | latarnie
	const front = ["domki", "plac-zabaw", "fontanna", "ogrodek"] as const
	const back = ["sklepik", "zamek", "latarnie"] as const
	const corridor = 0.1 * sceneW
	// skala z CIĘŻSZEJ połówki (lewa: domki+plac, prawa: fontanna+ogródek),
	// bo każda para siedzi w swojej połowie sceny obok korytarza drogi
	const half = Math.max(
		BASE.domki.w + BASE["plac-zabaw"].w,
		BASE.fontanna.w + BASE.ogrodek.w,
	)
	const sF = Math.min(1, (sceneW / 2 - corridor / 2 - GAP * 2) / half)
	const raise = Math.max(...front.map((id) => h(id, BASE[id].w * sF))) + 6

	const sumBack = back.reduce((a, id) => a + BASE[id].w, 0)
	const sB = Math.min(
		MAX_SCALE,
		sF * 1.25,
		(sceneW - GAP * 2) / sumBack,
		(skyRoom - raise) / h("zamek", BASE.zamek.w),
	)

	const out = {} as Record<BuildingId, Plot>
	// tył: zamek dokładnie w środku, sąsiedzi wyśrodkowani w swoich połówkach
	const zw = BASE.zamek.w * sB
	const zl = sceneW / 2 - zw / 2
	out.zamek = place("zamek", zl, zw, raise, 3)
	const skw = BASE.sklepik.w * sB
	out.sklepik = place("sklepik", Math.max(GAP, zl / 2 - skw / 2), skw, raise, 2)
	const lw = BASE.latarnie.w * sB
	out.latarnie = place(
		"latarnie",
		Math.min(sceneW - GAP - lw, zl + zw + (sceneW - zl - zw) / 2 - lw / 2),
		lw,
		raise,
		2,
	)
	// przód: lewa para dosunięta do korytarza w lewo, prawa w prawo; luz
	// (na tablecie) rozchodzi się w odstępy, nie w sam brzeg
	const gapF = Math.min(
		40,
		Math.max(GAP, (sceneW / 2 - corridor / 2 - half * sF) / 2),
	)
	let x = sceneW / 2 - corridor / 2
	for (const id of ["plac-zabaw", "domki"] as const) {
		const w = BASE[id].w * sF
		x -= w
		out[id] = place(id, x, w, 0, id === "domki" ? 11 : 12)
		x -= gapF
	}
	x = sceneW / 2 + corridor / 2
	for (const id of ["fontanna", "ogrodek"] as const) {
		const w = BASE[id].w * sF
		out[id] = place(id, x, w, 0, id === "fontanna" ? 12 : 11)
		x += w + gapF
	}
	return out
}

// Zieleń wokół działek, też z układu: drzewa w LUKACH tylnego rzędu (na tej
// samej wysokości, z=0 — za budynkami, nigdy przed nimi) i na skrajach
// przedniego; krzaki na linii gruntu w lukach przedniego rzędu. Dzięki temu
// drzewa nie wyrastają zza niskich budynków z przodu.
export interface Green {
	left: number
	width: number
	dy: number
	z: number
	kind: "tree" | "bush"
	variant: "mint" | "spring" | "blossom"
}
export function layoutGreenery(
	plots: Record<BuildingId, Plot>,
	sceneW: number,
): Green[] {
	const out: Green[] = []
	const gapTree = (
		x0: number,
		x1: number,
		variant: Green["variant"],
		dy: number,
	) => {
		const room = x1 - x0
		if (room < 22) return
		const w = Math.min(72, room * 0.8)
		out.push({
			left: x0 + (room - w) / 2,
			width: w,
			dy,
			z: 0,
			kind: "tree",
			variant,
		})
	}
	const { sklepik, zamek, latarnie, domki, ogrodek, fontanna } = plots
	const back = zamek.dy - 4
	gapTree(0, sklepik.left, "mint", back)
	gapTree(sklepik.left + sklepik.width, zamek.left, "blossom", back)
	gapTree(zamek.left + zamek.width, latarnie.left, "spring", back)
	gapTree(latarnie.left + latarnie.width, sceneW, "mint", back)
	gapTree(0, domki.left, "spring", 2)
	gapTree(ogrodek.left + ogrodek.width, sceneW, "blossom", 2)
	// krzaki z przodu: między parami i przy brzegach (z=6 — przed budynkami)
	const bush = (x: number) =>
		out.push({
			left: x,
			width: 44,
			dy: -6,
			z: 6,
			kind: "bush",
			variant: "spring",
		})
	bush(Math.max(2, domki.left - 30))
	bush(
		fontanna.left +
			fontanna.width +
			(ogrodek.left - fontanna.left - fontanna.width) / 2 -
			22,
	)
	bush(Math.min(sceneW - 46, ogrodek.left + ogrodek.width - 10))
	return out
}

import { describe, expect, test } from "bun:test"
import { BUILDINGS } from "../../game/village"
import { layoutPlots } from "./layout"

// prostokąty artów (stopa na linii gruntu + dy) nie mogą się przecinać —
// na telefonie, tablecie w pionie/poziomie i laptopie
const SCENES: [number, number][] = [
	[340, 560], // wąski telefon
	[358, 700], // telefon
	[736, 900], // tablet pion
	[868, 580], // małe okno laptopa
	[1024, 620], // tablet poziom / laptop (max-w-5xl)
	[1024, 956], // wysoki desktop
]

function rects(w: number, h: number) {
	const plots = layoutPlots(w, h)
	return BUILDINGS.map((b) => {
		const p = plots[b.id]
		return {
			id: b.id,
			x0: p.left,
			x1: p.left + p.width,
			y0: p.dy, // od linii gruntu w górę
			y1: p.dy + p.height,
		}
	})
}

describe("layoutPlots", () => {
	test.each(SCENES)("brak nakładania budynków na scenie %dx%d", (w, h) => {
		const rs = rects(w, h)
		for (const a of rs)
			for (const b of rs) {
				if (a.id >= b.id) continue
				const overlap =
					a.x0 < b.x1 - 0.5 &&
					b.x0 < a.x1 - 0.5 &&
					a.y0 < b.y1 - 0.5 &&
					b.y0 < a.y1 - 0.5
				expect(overlap, `${a.id} nachodzi na ${b.id}`).toBe(false)
			}
	})

	test.each(SCENES)("budynki mieszczą się w scenie %dx%d", (w, h) => {
		for (const r of rects(w, h)) {
			expect(r.x0).toBeGreaterThanOrEqual(0)
			expect(r.x1).toBeLessThanOrEqual(w + 0.5)
			// wierzchołek nie wyżej niż ~5% sceny nad niebem (grunt na 47%)
			expect(r.y1).toBeLessThanOrEqual(0.47 * h)
		}
	})

	test("zamek stoi na środku (brama = początek drogi)", () => {
		for (const [w, h] of SCENES) {
			const z = layoutPlots(w, h).zamek
			const cx = z.left + z.width / 2
			expect(Math.abs(cx - w / 2)).toBeLessThan(w * 0.08)
		}
	})
})

import { useEffect } from "react"

// Safari na iPadzie ignoruje `overflow: hidden` na body, stąd `position: fixed`
// + przywrócenie pozycji w cleanup. Wołać w każdym overlayu `fixed inset-0`
// (komponenty montowane tylko gdy otwarte — bez argumentu; inline — z `active`).
export function useScrollLock(active = true) {
	useEffect(() => {
		if (!active) return
		const y = window.scrollY
		const { style } = document.body
		const prev = {
			position: style.position,
			top: style.top,
			width: style.width,
			overflow: style.overflow,
		}
		style.position = "fixed"
		style.top = `-${y}px`
		style.width = "100%"
		style.overflow = "hidden"
		return () => {
			Object.assign(style, prev)
			window.scrollTo(0, y)
		}
	}, [active])
}

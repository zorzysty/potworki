import { useEffect } from "react"
import { CollectionScreen } from "./screens/CollectionScreen"
import { DebugScreen } from "./screens/DebugScreen"
import { HatchScreen } from "./screens/HatchScreen"
import { HomeScreen } from "./screens/HomeScreen"
import { RoundScreen } from "./screens/RoundScreen"
import { useGame } from "./store/store"

const DEBUG_ENABLED = new URLSearchParams(window.location.search).has("debug")

export function App() {
	const screen = useGame(s => s.screen)

	// fizyczna klawiatura → te same akcje store co keypad dotykowy
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			if (event.ctrlKey || event.metaKey || event.altKey) return
			const state = useGame.getState()
			if (state.screen !== "round") return
			if (event.key >= "0" && event.key <= "9") {
				event.preventDefault()
				state.pressDigit(Number(event.key))
			} else if (event.key === "Backspace") {
				event.preventDefault()
				state.pressBackspace()
			} else if (event.key === "Enter") {
				event.preventDefault()
				state.pressConfirm()
			}
		}
		window.addEventListener("keydown", onKey)
		return () => window.removeEventListener("keydown", onKey)
	}, [])

	// przycisk Wstecz przeglądarki/Androida → zawsze do domku, nigdy poza grę
	useEffect(() => {
		history.pushState(null, "")
		const onPop = () => {
			useGame.getState().goTo("home")
			history.pushState(null, "")
		}
		window.addEventListener("popstate", onPop)
		return () => window.removeEventListener("popstate", onPop)
	}, [])

	const background =
		screen === "hatch"
			? "bg-gradient-to-b from-indigo-950 via-purple-900 to-indigo-900"
			: "bg-gradient-to-b from-violet-200 via-fuchsia-100 to-amber-50"

	return (
		<div className={`min-h-dvh ${background}`}>
			<div className="mx-auto min-h-dvh max-w-lg land:max-w-none">
				{screen === "home" && <HomeScreen debugEnabled={DEBUG_ENABLED} />}
				{screen === "round" && <RoundScreen />}
				{screen === "hatch" && <HatchScreen />}
				{screen === "collection" && <CollectionScreen />}
				{screen === "debug" && DEBUG_ENABLED && <DebugScreen />}
			</div>
		</div>
	)
}

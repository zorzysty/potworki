import {
	isDivisionOnly,
	isFeedOnly,
	isGapOnly,
	isPairsOnly,
	rarityOf,
} from "../monsters/catalog"
import type { SaveState } from "../store/schema"
import { isPoolComplete } from "./collection"
import {
	WISH_COST,
	WISH_COST_NO_DREAM,
	WISH_MODE,
	wishEggPrice,
} from "./rewards"
import { wishEggDiscount, wishEggUnlocked } from "./village"

export type WishEggState = Pick<
	SaveState,
	"dreamMonsterId" | "ownedMonsters" | "achievementStats" | "village"
>

// Jedyne źródło prawdy o Jajku Życzeń — guard kupna w store i przycisk w UI
// czytają ten sam obiekt, więc etykieta „(wymarzony!)" i cena nie mogą się rozjechać.
// - unlocked: studnia życzeń (Fontanna L1+)
// - available: pula mnożeniowa domyka się PRZED kompletem katalogu
// - dreamApplies: wymarzony liczy się tylko, gdy nieposiadany i w puli mnożeniowej
//   (ekskluzywny tylko-dzielenie / tylko-luka zdobywa się realną grą w swoim trybie)
// - cost: baza wg wymarzonego + progresja za kupione (licznik `wishEggsBought`
//   z achievementStats — bez bliźniaczego pola zapisu) − zniżka fontanny;
//   podłogę i sufit dopłaty egzekwuje samo `wishEggPrice`
export function wishEgg(state: WishEggState): {
	cost: number
	dreamApplies: boolean
	unlocked: boolean
	available: boolean
} {
	const dream = state.dreamMonsterId
	const dreamApplies =
		dream !== null &&
		!(dream in state.ownedMonsters) &&
		!isDivisionOnly(dream) &&
		!isGapOnly(dream) &&
		!isPairsOnly(dream) &&
		!isFeedOnly(dream)
	return {
		cost: wishEggPrice(
			dreamApplies ? WISH_COST[rarityOf(dream)] : WISH_COST_NO_DREAM,
			state.achievementStats.wishEggsBought,
			wishEggDiscount(state.village),
		),
		dreamApplies,
		unlocked: wishEggUnlocked(state.village),
		available: !isPoolComplete(state.ownedMonsters, WISH_MODE),
	}
}

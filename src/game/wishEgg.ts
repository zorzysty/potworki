import { rarityOf } from "../monsters/catalog"
import type { SaveState } from "../store/schema"
import { isNonLegendaryComplete } from "./collection"
import { WISH_COST, WISH_COST_NO_DREAM, wishEggPrice } from "./rewards"
import { wishEggDiscount, wishEggUnlocked } from "./village"

export type WishEggState = Pick<
	SaveState,
	"dreamMonsterId" | "ownedMonsters" | "achievementStats" | "village"
>

// Jedyne źródło prawdy o Jajku Życzeń — guard kupna w store i przycisk w UI
// czytają ten sam obiekt, więc etykieta „(wymarzony!)" i cena nie mogą się rozjechać.
// - unlocked: studnia życzeń (Fontanna L1+)
// - available: dopóki brakuje choć jednego pospolitego/rzadkiego/epickiego —
//   po ich komplecie jajko jest zablokowane (decyzja maintainera 2026-09-05;
//   wcześniej blokował dopiero komplet całej puli mnożeniowej z legendarnymi)
// - dreamApplies: wymarzony liczy się tylko, gdy nieposiadany i NIElegendarny
//   (legendarne — bazowe i ekskluzywne — zdobywa się wyłącznie jajkami z rund;
//   jajko życzeń domyka pospolite/rzadkie/epickie)
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
		rarityOf(dream) !== "legendary"
	return {
		cost: wishEggPrice(
			dreamApplies ? WISH_COST[rarityOf(dream)] : WISH_COST_NO_DREAM,
			state.achievementStats.wishEggsBought,
			wishEggDiscount(state.village),
		),
		dreamApplies,
		unlocked: wishEggUnlocked(state.village),
		available: !isNonLegendaryComplete(state.ownedMonsters),
	}
}

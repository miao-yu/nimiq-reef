/**
 * How many handfuls of food are in the water today.
 *
 * Your own daily feed counts alongside the ones other people dropped in.
 * Before this, the flakes keyed on other people's feedings only — which made
 * the button you press every day the one action in the app with no visible
 * effect, while a stranger's tap changed your whole tank.
 *
 * Deliberately not stored. It is two facts already in the state, and a third
 * copy of them would be a third thing to keep in step.
 */
export function foodInWater(reef: { fedToday: boolean; receivedToday: number }): number {
  return reef.receivedToday + (reef.fedToday ? 1 : 0);
}

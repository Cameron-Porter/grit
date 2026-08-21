export type PlateBreakdown = { weight: number; count: number };

export type PlateLoadingResult = {
  weightPerSide: number;
  plates: PlateBreakdown[];
  loadedWeight: number;
  remainderPerSide: number;
  totalRemainder: number;
  belowBarWeight: boolean;
};

export const STANDARD_PLATES = [45, 35, 25, 10, 5, 2.5, 1.25];

export const STANDARD_BAR_WEIGHTS = [45, 35, 33, 25, 15];

// Plate math is done in hundredths (cents-of-a-pound) so repeated additions of
// values like 2.5 or 1.25 can't drift the way raw float arithmetic would.
const UNITS_PER_POUND = 100;
const toUnits = (pounds: number) => Math.round(pounds * UNITS_PER_POUND);
const toPounds = (units: number) => units / UNITS_PER_POUND;

/**
 * Greedily fills one side of the bar from the largest available plate down,
 * the same way a lifter loads a barbell. Any weight the available plates
 * can't reach exactly is reported back as remainder rather than silently
 * dropped or rounded away.
 */
export function calculatePlateLoading(
  targetWeight: number,
  barWeight: number,
  availablePlates: number[],
): PlateLoadingResult {
  const safeTarget = Number.isFinite(targetWeight) ? Math.max(0, targetWeight) : 0;
  const safeBar = Number.isFinite(barWeight) ? Math.max(0, barWeight) : 0;

  if (safeTarget <= safeBar) {
    return {
      weightPerSide: 0,
      plates: [],
      loadedWeight: safeBar,
      remainderPerSide: 0,
      totalRemainder: 0,
      belowBarWeight: safeTarget < safeBar,
    };
  }

  const sortedPlates = [...new Set(availablePlates.filter((plate) => Number.isFinite(plate) && plate > 0))].sort(
    (a, b) => b - a,
  );

  let remainingUnits = Math.round((toUnits(safeTarget) - toUnits(safeBar)) / 2);
  const perSideUnits = remainingUnits;
  const plates: PlateBreakdown[] = [];
  for (const plate of sortedPlates) {
    const plateUnits = toUnits(plate);
    const count = Math.floor(remainingUnits / plateUnits);
    if (count > 0) {
      plates.push({ weight: plate, count });
      remainingUnits -= count * plateUnits;
    }
  }

  const loadedPerSideUnits = perSideUnits - remainingUnits;
  const loadedWeight = safeBar + 2 * toPounds(loadedPerSideUnits);

  return {
    weightPerSide: toPounds(perSideUnits),
    plates,
    loadedWeight,
    remainderPerSide: toPounds(remainingUnits),
    totalRemainder: toPounds(remainingUnits * 2),
    belowBarWeight: false,
  };
}

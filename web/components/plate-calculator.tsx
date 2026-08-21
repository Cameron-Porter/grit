'use client';

import { useId, useState } from 'react';
import { calculatePlateLoading, STANDARD_PLATES } from '@/lib/workout/plate-calculator';

const DEFAULT_PLATES = new Set([45, 25, 10, 5, 2.5]);

export function PlateCalculator() {
  const [barWeight, setBarWeight] = useState(45);
  const [targetWeight, setTargetWeight] = useState(135);
  const [enabledPlates, setEnabledPlates] = useState(DEFAULT_PLATES);
  const resultsId = useId();

  const togglePlate = (plate: number, checked: boolean) => setEnabledPlates((current) => {
    const next = new Set(current);
    if (checked) next.add(plate); else next.delete(plate);
    return next;
  });

  const result = calculatePlateLoading(targetWeight, barWeight, [...enabledPlates]);

  return <div className="plate-calculator">
    <div className="form-grid">
      <label>Bar weight (lb)
        <input type="number" min="0" step="0.5" value={barWeight} onChange={(event) => setBarWeight(event.target.valueAsNumber || 0)} />
      </label>
      <label>Target weight (lb)
        <input type="number" min="0" step="0.5" value={targetWeight} onChange={(event) => setTargetWeight(event.target.valueAsNumber || 0)} />
      </label>
    </div>
    <fieldset className="equipment-preferences">
      <legend>Available plate pairs (per side)</legend>
      <div className="equipment-grid" aria-label="Available plate pairs">
        {STANDARD_PLATES.map((plate) => <label key={plate}>
          <input type="checkbox" checked={enabledPlates.has(plate)} onChange={(event) => togglePlate(plate, event.target.checked)} />
          <strong>{plate} lb</strong>
        </label>)}
      </div>
    </fieldset>
    <dl className="detail-grid" role="status" aria-live="polite" id={resultsId}>
      <div><dt>Per side</dt><dd>{result.weightPerSide} lb</dd></div>
      <div><dt>Loaded weight</dt><dd>{result.loadedWeight} lb</dd></div>
      {result.plates.map((plate) => <div key={plate.weight}><dt>{plate.weight} lb plates</dt><dd>× {plate.count} per side</dd></div>)}
    </dl>
    {result.belowBarWeight && <p className="notice error" role="alert">
      Target weight is below the bar itself ({barWeight} lb) — the bar can't be unloaded further.
    </p>}
    {!result.belowBarWeight && result.totalRemainder > 0 && <p className="notice error" role="alert">
      {result.remainderPerSide} lb per side ({result.totalRemainder} lb total) can't be loaded with the selected plates.
    </p>}
  </div>;
}

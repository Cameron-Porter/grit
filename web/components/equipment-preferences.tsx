'use client';

import { useState } from 'react';

type Props = { equipment: string[]; initiallyEnabled: boolean; initiallyPreferred: string[] };

export function EquipmentPreferences({ equipment, initiallyEnabled, initiallyPreferred }: Props) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [selected, setSelected] = useState(() => new Set(initiallyPreferred));
  const toggleEquipment = (item: string, checked: boolean) => setSelected(current => {
    const next = new Set(current);
    if (checked) next.add(item); else next.delete(item);
    return next;
  });

  return <fieldset className="equipment-preferences">
    <legend className="sr-only">Equipment preferences</legend>
    <div className="setting-row">
      <div><strong>Preferred equipment</strong><span>Limit generated programs to equipment you can use.</span></div>
      <label className="switch" aria-label="Preferred equipment">
        <input name="usePreferredEquipment" type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} />
        <span aria-hidden="true" />
      </label>
    </div>
    {enabled ? <div className="equipment-grid equipment-toggle-grid" aria-label="Available equipment">{equipment.map(item => <label key={item}>
      <strong>{item}</strong>
      <span className="switch equipment-switch"><input name="preferredEquipment" value={item} type="checkbox" checked={selected.has(item)} onChange={event => toggleEquipment(item,event.target.checked)}/><span aria-hidden="true" /></span>
    </label>)}</div> : [...selected].map(item => <input key={item} name="preferredEquipment" value={item} type="hidden" />)}
  </fieldset>;
}

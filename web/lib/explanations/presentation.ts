import type { EvidenceSource } from './types';

/** Keep implementation excerpts available for grounding, never in the user response. */
export function presentSources(sources: EvidenceSource[], citations: string[]): EvidenceSource[] {
  return sources.filter(source => citations.includes(source.id) && source.id !== 'gates').map(source => {
    if (source.id.startsWith('rule:')) {
      return { id: source.id, label: 'Training guidance', text: 'Grit’s training rules were used as background. They do not confirm why an older target was chosen.' };
    }
    return { id: source.id, label: source.label.replace(/\s*·\s*(?:HV|ST|RC|VA|PB)-\d+/g, ''), text: source.displayText ?? source.text };
  }).filter((source, index, all) => all.findIndex(other => other.label === source.label && other.text === source.text) === index);
}

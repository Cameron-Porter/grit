export function unknownWorkoutExerciseNames(names: string[], allowedNames: ReadonlySet<string>) {
  const missing: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    const normalized = name.trim();
    if (allowedNames.has(normalized) || seen.has(normalized)) continue;
    seen.add(normalized);
    missing.push(normalized);
  }
  return missing;
}

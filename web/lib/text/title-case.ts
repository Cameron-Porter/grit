export function titleCase(value: string): string {
  return value
    .trim()
    .split(/([\s-]+)/)
    .map(part => /^[\s-]+$/.test(part) ? part : `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join('');
}

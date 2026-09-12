export function getDirectiveSources(csp: string, name: string): string[] {
  const directive = csp
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${name} `));

  return directive?.split(/\s+/).slice(1) ?? [];
}

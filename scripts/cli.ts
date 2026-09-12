export function argumentValue(
  flag: string,
  argv: readonly string[] = process.argv,
): string | undefined {
  const index = argv.indexOf(flag);
  return index === -1 ? undefined : argv[index + 1];
}

export function requiredEnvironmentVariable(
  name: string,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): string {
  const value = environment[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

/** Quotes a SQLite identifier without treating it as SQL text. */
export function quoteSqliteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

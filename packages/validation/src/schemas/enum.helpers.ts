import { z } from "zod";

// Build a zod enum from a readonly string tuple
export const enumFrom = <T extends readonly [string, ...string[]]>(arr: T) => z.enum([...arr]);

// Build a zod enum from a readonly string tuple with a default value
export const enumWithDefault = <T extends readonly [string, ...string[]]>(arr: T, d: T[number]) =>
  enumFrom(arr).default(d);

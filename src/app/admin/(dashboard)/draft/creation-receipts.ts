import type { ZodType } from "zod";
import {
  readStoredJson,
  writeVerifiedJson,
} from "@/app/admin/(dashboard)/draft/verified-storage";

export function createCreationReceiptStore<T extends { creationToken: string }>(
  kind: "post" | "page",
  schema: ZodType<T>,
) {
  const keyFor = (actorId: string) =>
    `honeycomb:draft:${kind}:${encodeURIComponent(actorId)}:creation-attempt`;
  const parseAt = (key: string) => {
    const result = schema.safeParse(readStoredJson(key));
    return result.success ? result.data : null;
  };
  const readToken = (key: string, token: string) => {
    const receipt = parseAt(`${key}:${token}`);
    return receipt?.creationToken === token ? receipt : null;
  };

  return {
    write(actorId: string, input: T): boolean {
      const receipt = schema.safeParse(input);
      if (!receipt.success) return false;
      const key = keyFor(actorId);
      const { creationToken } = receipt.data;
      if (!writeVerifiedJson(`${key}:${creationToken}`, receipt.data))
        return false;
      try {
        window.sessionStorage.setItem(key, creationToken);
      } catch {
        // The durable receipt is still discoverable without a tab preference.
      }
      return true;
    },
    read(actorId: string, token?: string): T | null {
      const key = keyFor(actorId);
      if (token !== undefined) {
        const receipt = readToken(key, token) ?? parseAt(key);
        return receipt?.creationToken === token ? receipt : null;
      }

      try {
        const selected = window.sessionStorage.getItem(key);
        const receipt = selected ? readToken(key, selected) : null;
        if (receipt) return receipt;
      } catch {
        // A new tab or unavailable session storage can use any pending receipt.
      }

      const legacy = parseAt(key);
      if (legacy) return legacy;
      try {
        const storage = window.localStorage;
        const prefix = `${key}:`;
        for (let index = 0; index < storage.length; index += 1) {
          const storedKey = storage.key(index);
          if (!storedKey?.startsWith(prefix)) continue;
          const receipt = readToken(key, storedKey.slice(prefix.length));
          if (receipt) return receipt;
        }
      } catch {
        // Reading recovery data remains best-effort.
      }
      return null;
    },
    clear(actorId: string, token: string): boolean {
      const key = keyFor(actorId);
      try {
        const storage = window.localStorage;
        const tokenKey = `${key}:${token}`;
        const ownsToken = Boolean(readToken(key, token));
        const ownsLegacy = parseAt(key)?.creationToken === token;
        if (ownsToken) storage.removeItem(tokenKey);
        if (ownsLegacy) storage.removeItem(key);
        return (
          (ownsToken || ownsLegacy) &&
          (!ownsToken || storage.getItem(tokenKey) === null) &&
          (!ownsLegacy || storage.getItem(key) === null)
        );
      } catch {
        return false;
      }
    },
  };
}

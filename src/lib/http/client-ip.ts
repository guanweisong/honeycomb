import { isIP } from "node:net";

export function parseIp(address: string) {
  const ip = address.trim();
  const version = isIP(ip);
  if (version === 4) return ip;
  if (version !== 6 || ip.includes("%")) return null;
  const canonical = new URL(`http://[${ip}]`).hostname.slice(1, -1);
  const mapped = canonical.match(/^::ffff:([0-9a-f]+):([0-9a-f]+)$/u);
  if (!mapped) return canonical;
  return mapped
    .slice(1)
    .map((group) => {
      const value = Number.parseInt(group, 16);
      return `${value >> 8}.${value & 255}`;
    })
    .join(".");
}

export function parseForwardedClientIp(forwarded: string, hops: number) {
  // Count from the right. Any additional prefix is outside the trust boundary.
  const chain = forwarded.split(",");
  const trustedSuffix = chain.slice(-hops).map(parseIp);
  if (trustedSuffix.length !== hops || trustedSuffix.includes(null))
    return null;
  return trustedSuffix[0] ?? null;
}

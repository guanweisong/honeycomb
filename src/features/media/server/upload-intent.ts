import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { getAuthEnv } from "@/env/server";
import { ApplicationError } from "@/lib/errors/application-error";
import {
  MediaUploadIntentInputSchema,
  type MediaUploadIntentInput,
} from "../upload-policy";

const DOMAIN = "honeycomb:media-upload-intent:v1\0";
const PayloadSchema = MediaUploadIntentInputSchema.safeExtend({
  version: z.literal(1),
  actorId: z.string().min(1),
  id: z.string().regex(/^[a-f0-9]{24}$/),
  uploadKey: z.string().regex(/^temporary\/[a-f0-9-]+\.[a-z]+$/),
  expiresAt: z.number().int().positive(),
});
export type UploadIntent = z.infer<typeof PayloadSchema>;
function signature(encoded: string) {
  const secret = getAuthEnv().AUTH_SECRET;
  if (!secret) throw new Error("Upload signing secret is not configured");
  return createHmac("sha256", secret).update(DOMAIN).update(encoded).digest();
}
export function createUploadIntent(
  file: MediaUploadIntentInput,
  actorId: string,
) {
  const input = MediaUploadIntentInputSchema.parse(file);
  const payload = PayloadSchema.parse({
    ...input,
    version: 1,
    actorId,
    id: randomUUID().replaceAll("-", "").slice(0, 24),
    uploadKey: `temporary/${randomUUID()}.${input.name.split(".").at(-1)?.toLowerCase()}`,
    expiresAt: Date.now() + 3600_000,
  });
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return {
    intent: `${encoded}.${signature(encoded).toString("base64url")}`,
    payload,
  };
}
export function verifyUploadIntent(
  intent: string,
  actorId: string,
): UploadIntent {
  try {
    if (intent.length > 16_384) throw new Error("Too long");
    const [encoded, mac, extra] = intent.split(".");
    if (
      !encoded ||
      !mac ||
      extra !== undefined ||
      !/^[A-Za-z0-9_-]+$/.test(mac)
    )
      throw new Error("Invalid token");
    const actual = Buffer.from(mac, "base64url");
    const expected = signature(encoded);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      throw new Error("Invalid signature");
    const payload = PayloadSchema.parse(
      JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")),
    );
    if (payload.actorId !== actorId || payload.expiresAt <= Date.now())
      throw new Error("Invalid actor or expiry");
    return payload;
  } catch {
    throw new ApplicationError(
      "BAD_REQUEST",
      "上传凭证无效或已过期，请重新上传",
    );
  }
}

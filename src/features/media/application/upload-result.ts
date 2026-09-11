import { z } from "zod";
import { MediaRecordSchema } from "./repository";

/** 仅在基础设施确认写入被拒绝、没有提交时抛出；超时或连接错误不属于此类。 */
export class MediaCreateRejectedError extends Error {}

export const MediaCreateResultSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("created"), media: MediaRecordSchema }),
  z.object({ state: z.literal("rejected"), message: z.string() }),
  z.object({ state: z.literal("indeterminate"), message: z.string() }),
]);
export type MediaCreateResult = z.output<typeof MediaCreateResultSchema>;

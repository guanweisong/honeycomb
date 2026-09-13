import type { MediaRecord } from "./repository";

/** 仅在基础设施确认写入被拒绝、没有提交时抛出；超时或连接错误不属于此类。 */
export class MediaCreateRejectedError extends Error {}

export type MediaCreateResult =
  | { state: "created"; media: MediaRecord }
  | { state: "rejected"; message: string }
  | { state: "indeterminate"; message: string };

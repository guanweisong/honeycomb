import type { MediaRecord } from "../application/repository";

/** 媒体共享 UI 使用的展示模型，不依赖 tRPC 输出或数据库 schema。 */
export type MediaViewModel = MediaRecord;

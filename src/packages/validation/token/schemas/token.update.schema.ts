import { TokenInsertSchema } from "./token.insert.schema";

/**
 * 更新 Token 时的数据验证 schema。
 *
 * 此 schema 是通过将 `TokenInsertSchema` 的所有字段标记为可选 (`.partial()`) 来创建的。
 * 这意味着在更新时，可以只提供需要修改的字段，例如只更新 `content` 而不改变 `userId`。
 */
export const TokenUpdateSchema = TokenInsertSchema.partial();

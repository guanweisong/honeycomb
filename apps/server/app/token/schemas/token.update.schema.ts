import { TokenCreateSchema } from "@/app/token/schemas/token.create.schema";

export const TokenUpdateSchema = TokenCreateSchema.partial();

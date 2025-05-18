import { z } from "zod";
import { MenuType } from ".prisma/client";

const MenuTypeSchema = z.nativeEnum(MenuType);

export const TypeSchema = MenuTypeSchema.default(MenuType.CATEGORY);

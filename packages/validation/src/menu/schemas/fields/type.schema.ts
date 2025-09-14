import { z } from "zod";
import { MENU_TYPE } from "@honeycomb/db";

const MenuTypeEnum = z.enum([...MENU_TYPE]);

export const TypeSchema = MenuTypeEnum.default("CATEGORY");

import { z } from "zod";
import { CategoryStatus } from ".prisma/client";

export const CategoryStatusEnum = z
  .nativeEnum(CategoryStatus)
  .default(CategoryStatus.ENABLE);

export const StatusSchema = CategoryStatusEnum;

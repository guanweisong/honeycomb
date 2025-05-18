import { z } from "zod";

export const GalleryLocationSchema = z
  .string()
  .max(200, "拍摄地区最大长度不可超过200");

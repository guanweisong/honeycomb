import { z } from "zod";

const staticImageSchema = z.union([
  z.string(),
  z.object({
    src: z.string(),
    width: z.number(),
    height: z.number(),
    blurDataURL: z.string().optional(),
    blurWidth: z.number().optional(),
    blurHeight: z.number().optional(),
  }),
]);

/** Next 的 SVG 声明为 any 以兼容组件 loader；在实际图片消费者边界验证固定资源契约。 */
export function parseStaticImage(value: unknown) {
  return staticImageSchema.parse(value);
}

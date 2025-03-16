import { z } from "zod";
import { PostType } from ".prisma/client";

const PostTypeEnum = z.nativeEnum(PostType);

export const TypeSchema = PostTypeEnum.default(PostType.ARTICLE);

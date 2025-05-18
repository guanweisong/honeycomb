import { z } from "zod";
import { PostStatus } from ".prisma/client";

const PostStatusEnum = z.nativeEnum(PostStatus);

export const StatusSchema = PostStatusEnum.default(PostStatus.TO_AUDIT);

import { z } from "zod";
import { LinkStatus } from ".prisma/client";

export const LinkStatusEnum = z.nativeEnum(LinkStatus);

export const StatusSchema = LinkStatusEnum.default(LinkStatus.ENABLE);

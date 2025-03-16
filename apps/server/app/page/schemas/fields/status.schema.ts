import { z } from "zod";
import { PageStatus } from ".prisma/client";

const PageStatusEnum = z.nativeEnum(PageStatus);

export const StatusSchema = PageStatusEnum.default(PageStatus.TO_AUDIT);

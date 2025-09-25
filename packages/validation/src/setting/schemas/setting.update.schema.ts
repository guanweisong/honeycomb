import { createUpdateSchema } from "drizzle-zod";
import { setting } from "@honeycomb/db/src/schema";

export const SettingUpdateSchema = createUpdateSchema(setting)
  .pick({
    siteName: true,
    siteSubName: true,
    id: true,
    siteCopyright: true,
    siteSignature: true,
    siteRecordNo: true,
    siteRecordUrl: true,
  })
  .required({ id: true });

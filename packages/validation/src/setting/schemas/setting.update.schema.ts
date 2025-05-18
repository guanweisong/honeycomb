import { z } from "zod";
import { SiteNameSchema } from "./fields/site.name.schema";
import { SiteSubNameSchema } from "./fields/site.sub.name.schema";
import { SiteSignatureSchema } from "./fields/site.signature.schema";
import { SiteCopyrightSchema } from "./fields/site.copyright.schema";
import { SiteRecordNoSchema } from "./fields/site.record.no.schema";
import { UrlSchema } from "../../schemas/fields/url.schema";
import { MultiLangSchema } from "../../schemas/multiLang.schema";

export const SettingUpdateSchema = z.object({
  siteName: MultiLangSchema(SiteNameSchema).optional(),
  siteSubName: MultiLangSchema(SiteSubNameSchema).optional(),
  siteSignature: MultiLangSchema(SiteSignatureSchema).optional(),
  siteCopyright: MultiLangSchema(SiteCopyrightSchema).optional(),
  siteRecordNo: SiteRecordNoSchema.optional(),
  siteRecordUrl: z.union([z.literal(""), UrlSchema.optional()]),
});

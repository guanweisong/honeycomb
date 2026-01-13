import { customType } from "drizzle-orm/sqlite-core";
import {
  type I18n,
  NullableI18nSchema,
} from "@/packages/validation/utils/i18n.schema";

export function i18nField(name: string) {
  return customType<{
    data: I18n | null;
    driverData: string;
  }>({
    dataType() {
      return "text";
    },
    toDriver(value) {
      return JSON.stringify(value ?? {});
    },
    fromDriver(value) {
      try {
        return NullableI18nSchema.parse(JSON.parse(value));
      } catch {
        return null;
      }
    },
  })(name);
}

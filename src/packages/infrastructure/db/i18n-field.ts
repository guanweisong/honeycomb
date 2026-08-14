import { customType } from "drizzle-orm/sqlite-core";
import {
  type I18n,
  NullableI18nSchema,
} from "@/packages/domain/localization/i18n";

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

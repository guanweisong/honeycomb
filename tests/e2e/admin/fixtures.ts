import type { SettingViewModel, UserViewModel } from "@/features/contracts";
import {
  UserLevel,
  UserStatus,
} from "@/packages/domain/identity/user";

export const mockedAdminUser = {
  id: "admin-1",
  name: "admin",
  email: "admin@honeycomb.test",
  level: UserLevel.ADMIN,
  status: UserStatus.ENABLE,
} satisfies Pick<UserViewModel, "id" | "name" | "email" | "level" | "status">;

export const mockedSiteSetting = {
  id: "setting-1",
  siteName: { en: "Honeycomb", zh: "蜂巢" },
  siteSubName: { en: "Site", zh: "站点" },
  siteSignature: { en: "Signature", zh: "签名" },
  siteCopyright: { en: "Copyright", zh: "版权" },
  siteRecordNo: null,
  siteRecordUrl: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
} satisfies NonNullable<SettingViewModel>;

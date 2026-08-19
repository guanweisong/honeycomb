import {
  ALL_PERMISSIONS,
  Permission,
  type Permission as PermissionValue,
} from "./permissions";

export type CapabilityConsumer =
  | "trpc"
  | "admin-action"
  | "admin-route"
  | "menu";

export interface CapabilityDefinition {
  readonly consumers: readonly CapabilityConsumer[];
}

/** 所有生产授权入口共享的能力注册表。 */
export const capabilityRegistry = {
  [Permission.categoryReadAll]: { consumers: ["trpc", "admin-route", "menu"] },
  [Permission.categoryCreate]: { consumers: ["trpc", "admin-action"] },
  [Permission.categoryDelete]: { consumers: ["trpc", "admin-action"] },
  [Permission.categoryUpdate]: { consumers: ["trpc", "admin-action"] },
  [Permission.commentReadAll]: { consumers: ["trpc", "admin-route", "menu"] },
  [Permission.commentModerate]: { consumers: ["trpc", "admin-action"] },
  [Permission.linkReadAll]: { consumers: ["trpc", "admin-route", "menu"] },
  [Permission.linkCreate]: { consumers: ["trpc", "admin-action"] },
  [Permission.linkDelete]: { consumers: ["trpc", "admin-action"] },
  [Permission.linkUpdate]: { consumers: ["trpc", "admin-action"] },
  [Permission.mediaReadAll]: { consumers: ["trpc", "admin-route", "menu"] },
  [Permission.mediaUpload]: { consumers: ["trpc", "admin-action"] },
  [Permission.mediaDelete]: { consumers: ["trpc", "admin-action"] },
  [Permission.menuReadAll]: { consumers: ["trpc", "admin-route", "menu"] },
  [Permission.menuUpdate]: { consumers: ["trpc", "admin-action"] },
  [Permission.pageReadAll]: { consumers: ["trpc", "admin-route", "menu"] },
  [Permission.pageCreate]: { consumers: ["trpc", "admin-action"] },
  [Permission.pageDelete]: { consumers: ["trpc", "admin-action"] },
  [Permission.pageUpdate]: { consumers: ["trpc", "admin-action"] },
  [Permission.postReadAll]: { consumers: ["trpc", "admin-route", "menu"] },
  [Permission.postCreate]: { consumers: ["trpc", "admin-action"] },
  [Permission.postDelete]: { consumers: ["trpc", "admin-action"] },
  [Permission.postUpdate]: { consumers: ["trpc", "admin-action"] },
  [Permission.postManageTags]: { consumers: ["trpc", "admin-action"] },
  [Permission.settingUpdate]: { consumers: ["trpc", "admin-action"] },
  [Permission.statisticsRead]: { consumers: ["trpc", "admin-route", "menu"] },
  [Permission.tagCreate]: { consumers: ["trpc", "admin-action"] },
  [Permission.tagDelete]: { consumers: ["trpc", "admin-action"] },
  [Permission.tagUpdate]: { consumers: ["trpc", "admin-action"] },
  [Permission.userReadSelf]: { consumers: ["trpc"] },
  [Permission.userReadAll]: { consumers: ["trpc", "admin-route", "menu"] },
  [Permission.userManage]: { consumers: ["trpc", "admin-action"] },
} as const satisfies Record<PermissionValue, CapabilityDefinition>;

export type Capability = keyof typeof capabilityRegistry;
export type CapabilityReference = PermissionValue | keyof typeof Permission;

const legacyCapabilityNames = new Set<keyof typeof Permission>(
  Object.keys(Permission) as (keyof typeof Permission)[],
);

export function isCapability(value: string): value is CapabilityReference {
  return Object.prototype.hasOwnProperty.call(capabilityRegistry, value) || legacyCapabilityNames.has(value as keyof typeof Permission);
}

export function getCapabilityDefinition(
  capability: PermissionValue,
): CapabilityDefinition {
  return capabilityRegistry[capability];
}

export const registeredCapabilities: readonly PermissionValue[] =
  Object.freeze(Object.keys(capabilityRegistry) as PermissionValue[]);

if (registeredCapabilities.length !== ALL_PERMISSIONS.length) {
  throw new Error("能力注册表必须覆盖全部权限");
}

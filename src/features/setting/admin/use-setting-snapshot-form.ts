"use client";
import { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SettingAdminUpdateSchema } from "../schema";
import type { SettingRecord } from "../types";

export type SettingFormValues = z.infer<typeof SettingAdminUpdateSchema>;
export function settingFormValues(setting: SettingRecord): SettingFormValues {
  return {
    id: setting.id,
    expectedVersion: setting.version,
    siteName: setting.siteName ?? {},
    siteSubName: setting.siteSubName ?? {},
    siteSignature: setting.siteSignature ?? {},
    siteCopyright: setting.siteCopyright ?? {},
    siteRecordNo: setting.siteRecordNo ?? "",
    siteRecordUrl: setting.siteRecordUrl ?? "",
  };
}
export function useSettingSnapshotForm(
  setting: SettingRecord | undefined,
  protectedSnapshot = false,
) {
  const form = useForm<SettingFormValues>({
    resolver: zodResolver(SettingAdminUpdateSchema),
    defaultValues: setting ? settingFormValues(setting) : undefined,
  });
  const { isDirty } = form.formState;
  const baseVersion = useRef(setting?.version);
  useEffect(() => {
    if (
      !setting ||
      protectedSnapshot ||
      isDirty ||
      (baseVersion.current !== undefined &&
        setting.version < baseVersion.current)
    )
      return;
    baseVersion.current = setting.version;
    form.reset(settingFormValues(setting));
  }, [setting, isDirty, form, protectedSnapshot]);
  return {
    form,
    acknowledge: (submitted: SettingFormValues, version: number) => {
      const current = { ...form.getValues(), expectedVersion: version };
      baseVersion.current = version;
      form.reset({ ...submitted, expectedVersion: version });
      form.reset(current, { keepDefaultValues: true });
    },
    acceptLatest: (latest: SettingRecord, keepLocal: boolean) => {
      const current = { ...form.getValues(), expectedVersion: latest.version };
      baseVersion.current = latest.version;
      form.reset(settingFormValues(latest));
      if (keepLocal) form.reset(current, { keepDefaultValues: true });
    },
  };
}

"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { notifyPublicSyncWarning } from "@/app/admin/(dashboard)/lib/action-state";
import {
  DynamicField,
  type FieldConfig,
} from "@/components/DynamicForm/DynamicField";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client/trpc";
import {
  isDeterminateRejectionCode,
  readTrpcErrorCode,
} from "@/lib/trpc/client/mutation-error";
import { Permission } from "@/lib/auth/permissions";
import { useCan, useCurrentUser } from "@/app/admin/(dashboard)/providers/use-current-user";
import { useSiteSetting } from "@/app/admin/(dashboard)/providers/use-site-setting";
import {
  useSettingSnapshotForm,
  type SettingFormValues,
} from "@/app/admin/(dashboard)/setting/components/use-setting-snapshot-form";
import type { SettingRecord } from "@/features/setting/types/setting.record";

export default function Setting() {
  const { user } = useCurrentUser();
  const { setting } = useSiteSetting();
  // Wait for a baseline before mounting controllers: StrictMode registration of
  // empty fields can mark the form dirty and block the first snapshot adoption.
  if (!setting)
    return <p role="status">设置尚未加载；若持续未显示，请刷新页面重试。</p>;
  return <SettingEditor key={user?.id ?? "signed-out"} />;
}

function SettingEditor() {
  const { setting, refreshSetting } = useSiteSetting();
  const canUpdate = useCan(Permission.settingUpdate);
  const mutation = trpc.setting.update.useMutation();
  const [loading, setLoading] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const editor = useSettingSnapshotForm(setting, loading || blocked);
  const [latest, setLatest] = useState<SettingRecord>();
  const busy = useRef(false);
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );

  const submit = async (submitted: SettingFormValues) => {
    if (busy.current || blocked || !setting) return;
    busy.current = true;
    setLoading(true);
    const started = generation.current;
    const active = () => generation.current === started;
    try {
      let saved;
      try {
        saved = await mutation.mutateAsync(submitted);
      } catch (error) {
        if (!active()) return;
        const code = readTrpcErrorCode(error);
        if (code === "CONFLICT") {
          setBlocked(true);
          toast.error("设置已有更新，本地输入已保留，请核对最新版本");
        } else if (isDeterminateRejectionCode(code))
          toast.error("更新失败，请检查输入和权限");
        else {
          setBlocked(true);
          toast.error("保存结果无法确认，本地输入已保留，请先核对服务器");
        }
        return;
      }
      if (!active()) return;
      editor.acknowledge(submitted, saved.version);
      let refreshFailed = false;
      try {
        if (!(await refreshSetting())) refreshFailed = true;
      } catch {
        refreshFailed = true;
      }
      if (!active()) return;
      if (refreshFailed) toast.warning("已保存，设置待刷新，请勿重复提交");
      else if (!notifyPublicSyncWarning(saved, toast.warning))
        toast.success("更新成功");
    } finally {
      if (active()) {
        busy.current = false;
        setLoading(false);
      }
    }
  };
  const reviewLatest = async () => {
    const started = generation.current;
    try {
      const current = await refreshSetting();
      if (!current) throw new Error("missing");
      if (generation.current === started) setLatest(current);
    } catch {
      if (generation.current === started)
        toast.error("最新设置读取失败，本地输入已保留");
    }
  };
  return (
    <div className="w-full mx-auto lg:w-[60%]">
      <Form {...editor.form}>
        <form
          onSubmit={(event) => {
            void editor.form.handleSubmit(submit)(event);
          }}
          className="space-y-4"
        >
          {fields.map((field) => (
            <DynamicField key={field.name} {...field} />
          ))}
          {canUpdate && (
            <Button
              type="submit"
              disabled={
                !setting || loading || blocked || !editor.form.formState.isDirty
              }
            >
              {loading ? "保存中…" : "提交"}
            </Button>
          )}
        </form>
      </Form>
      {blocked && (
        <div role="alert">
          保存发生冲突或结果未知，请先核对服务器。
          <Button onClick={reviewLatest}>读取最新设置供核对</Button>
        </div>
      )}
      {latest && (
        <div>
          <p>
            服务器版本 {latest.version}。核对后可保留本地输入，或放弃本地更改。
          </p>
          <pre className="max-h-48 overflow-auto">
            {JSON.stringify(latest, null, 2)}
          </pre>
          <Button
            onClick={() => {
              editor.acceptLatest(latest, true);
              setBlocked(false);
              setLatest(undefined);
            }}
          >
            已核对，保留本地并使用此版本
          </Button>
          <Button
            onClick={() => {
              editor.acceptLatest(latest, false);
              setBlocked(false);
              setLatest(undefined);
            }}
          >
            放弃本地，加载服务器设置
          </Button>
        </div>
      )}
    </div>
  );
}

const fields: FieldConfig[] = [
  {
    label: "站点名称",
    name: "siteName",
    type: "text",
    placeholder: "请填写站点名称",
    multiLang: true,
  },
  {
    label: "副标题",
    name: "siteSubName",
    type: "text",
    placeholder: "请填写副标题",
    multiLang: true,
  },
  {
    label: "签名",
    name: "siteSignature",
    type: "textarea",
    placeholder: "请填写签名",
    multiLang: true,
  },
  {
    label: "版权信息",
    name: "siteCopyright",
    type: "textarea",
    placeholder: "请填写版权信息",
    multiLang: true,
  },
  {
    label: "备案号",
    name: "siteRecordNo",
    type: "text",
    placeholder: "请填写备案号",
  },
  {
    label: "工信部网址",
    name: "siteRecordUrl",
    type: "text",
    placeholder: "请填写工信部网址",
  },
];

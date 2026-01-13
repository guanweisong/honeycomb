"use client";

import { useSettingStore } from "@/app/admin/stores/useSettingStore";
import { toast } from "sonner";
import { DynamicForm } from "@/packages/ui/extended/DynamicForm";
import { SettingUpdateSchema } from "@/packages/validation/schemas/setting/setting.update.schema";
import { trpc } from "@/packages/trpc/client/trpc";

/**
 * 网站设置页面。
 * 允许管理员配置网站的各项全局设置，如站点名称、签名等。
 * 使用 `react-hook-form` 管理表单状态，并通过 tRPC 与后端进行数据交互。
 */
const Setting = () => {
  const settingStore = useSettingStore();

  const { setting, querySetting } = settingStore;

  /**
   * 更新网站设置的 tRPC mutation。
   * 用于向后端提交设置更改。
   */
  const updateSetting = trpc.setting.update.useMutation();

  /**
   * 表单提交处理器。
   * 当用户提交设置表单时调用，将表单值发送到后端进行更新，并刷新本地设置缓存。
   * @param {any} values - 表单提交的值。
   */
  const handleSubmit = async (values: any) => {
    try {
      await updateSetting.mutateAsync({ id: setting!.id, ...values });
      await querySetting();
      toast.success("更新成功");
    } catch (e) {
      toast.error("更新失败");
    }
  };

  return (
    <div className="w-[60%] mx-auto">
      <DynamicForm
        defaultValues={setting}
        schema={SettingUpdateSchema}
        fields={[
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
        ]}
        onSubmit={handleSubmit}
      />
    </div>
  );
};

export default Setting;

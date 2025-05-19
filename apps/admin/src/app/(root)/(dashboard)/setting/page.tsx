"use client";

import { useSettingStore } from "@/stores/useSettingStore";
import SettingService from "./service";
import { toast } from "sonner";
import { DynamicForm } from "@honeycomb/ui/extended/DynamicForm";
import { SettingUpdateSchema } from "@honeycomb/validation/setting/schemas/setting.update.schema";

const Setting = () => {
  const settingStore = useSettingStore();

  const { setting, querySetting } = settingStore;

  /**
   * 保存事件
   */
  const handleSubmit = async (values: any) => {
    return SettingService.update(setting!.id, values).then(async (result) => {
      if (result.status === 201) {
        querySetting();
        toast.success("更新成功");
      }
    });
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

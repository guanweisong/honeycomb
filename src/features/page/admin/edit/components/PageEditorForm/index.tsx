import type { UseFormReturn } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { DynamicField } from "@/components/DynamicForm/DynamicField";
import type { PageEditorValues } from "../../transforms/page-draft";
import { pageTemplateOptions } from "@/features/page/admin/options";

type PageEditorFormProps = { form: UseFormReturn<PageEditorValues> };

export function PageEditorForm({ form }: PageEditorFormProps) {
  return (
    <Form {...form}>
      <form className="lg:flex lg:gap-8">
        <div className="lg:flex-1 flex flex-col gap-3 mb-3">
          <DynamicField
            name="title"
            type="text"
            label="标题"
            placeholder="在此输入页面标题"
            multiLang
          />
          <DynamicField
            name="content"
            type="richText"
            label="内容"
            placeholder="请输入内容"
            multiLang
          />
        </div>
        <div className="lg:w-80 space-y-4">
          <DynamicField
            name="template"
            type="select"
            label="模板类型"
            options={pageTemplateOptions}
          />
        </div>
      </form>
    </Form>
  );
}
/**
 * 页面编辑表单，负责渲染页面基础字段和内容字段。
 */

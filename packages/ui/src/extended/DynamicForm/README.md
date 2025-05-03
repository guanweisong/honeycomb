# 🧩 DynamicForm

基于 `react-hook-form` + `zod` 的动态表单组件，支持外部控制、字段联动、隐藏字段重置等高级功能。

## 📦 特性

- ✅ 支持 Zod 校验
- ✅ 动态字段控制（显示 / 禁用）
- ✅ 自动处理隐藏字段清空逻辑
- ✅ 使用 React 未来架构（无 `forwardRef`）
- ✅ 外部 API 控制表单：`setValue`、`getValues`、`reset`、`clear`

## 🔧 安装前提

- `react-hook-form@^7`
- `zod`
- 你自己的 `@ui/components` 组件系统（已封装 `Form`, `Input`, `Select` 等）

## 🚀 快速开始

```tsx
import { DynamicForm } from "@/components/dynamic-form";
import { z } from "zod";
import { useRef } from "react";

const schema = z.object({
  name: z.string().min(1),
  gender: z.string(),
  enableExtra: z.boolean(),
  extra: z.string().optional(),
});

export default function Page() {
  const formRef = useRef(null);

  return (
    <DynamicForm
      schema={schema}
      defaultValues={{
        name: "",
        gender: "",
        enableExtra: false,
        extra: "",
      }}
      formRef={formRef}
      onSubmit={(values) => {
        console.log(values);
      }}
      fields={[
        { name: "name", label: "姓名", type: "text" },
        {
          name: "gender",
          label: "性别",
          type: "select",
          options: [
            { label: "男", value: "male" },
            { label: "女", value: "female" },
          ],
        },
        {
          name: "enableExtra",
          label: "启用附加字段",
          type: "switch",
        },
        {
          name: "extra",
          label: "附加内容",
          type: "textarea",
          hidden: (values) => !values.enableExtra,
        },
      ]}
    />
  );
}
```

## 🧠 Props 说明

| 参数        | 类型 | 描述 |
|-------------|------|------|
| `schema`    | `ZodType` | 表单校验规则 |
| `fields`    | `FieldConfig[]` | 字段配置数组 |
| `defaultValues` | `z.infer<typeof schema>` | 默认值 |
| `onSubmit`  | `(values) => void` | 提交回调 |
| `loading`   | `boolean` | 是否展示 loading skeleton |
| `formRef`   | `MutableRefObject<DynamicFormRef | null>` | 外部调用表单 API 的引用 |

## 🧰 FieldConfig 类型

```ts
type FieldConfig<TSchema extends ZodTypeAny = ZodTypeAny> = {
  name: Path<z.infer<TSchema>>;
  label?: string;
  type: "text" | "textarea" | "select" | "switch" | "calendar" | "calendar-range";
  options?: { label: string; value: string }[] | ((formValues: any) => { label: string; value: string }[]);
  placeholder?: string;
  hidden?: (formValues: any) => boolean;
  disabled?: (formValues: any) => boolean;
};
```

## 📡 外部控制：DynamicFormRef

你可以通过 `formRef.current` 使用：

```ts
formRef.current?.setValue("name", "张三");
formRef.current?.getValues();
formRef.current?.reset(); // 同 RHF reset
formRef.current?.clear(); // 自定义方法：清空所有字段为 undefined
```

### 类型定义（自动推导字段名）

```ts
type DynamicFormRef<T = any> = Pick<
  UseFormReturn<T>,
  "setValue" | "getValues" | "reset"
> & {
  clear: () => void;
};
```
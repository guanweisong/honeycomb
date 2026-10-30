import { PageStatusName } from "@/features/page/types/page.status-name";
import { PageTemplateName } from "@/features/page/types/page.template-name";
import { PageStatus } from "@/features/page/types/page.status";
import { PageTemplate } from "@/features/page/types/page.template";

/** 用于在 UI 中显示页面状态的选项数组。 */
export const pageStatusOptions = [
  {
    label: PageStatusName.PUBLISHED,
    value: PageStatus.PUBLISHED,
  },
  {
    label: PageStatusName.DRAFT,
    value: PageStatus.DRAFT,
  },
  {
    label: PageStatusName.TO_AUDIT,
    value: PageStatus.TO_AUDIT,
  },
];

/** 用于 UI 展示的页面模板选项。 */
export const pageTemplateOptions = [
  {
    label: PageTemplateName.DEFAULT,
    value: PageTemplate.DEFAULT,
  },
  {
    label: PageTemplateName.FRIENDLY_LINKS,
    value: PageTemplate.FRIENDLY_LINKS,
  },
];

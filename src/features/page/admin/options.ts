import { PageStatus } from "@/features/page/page-status";
import { PageTemplate } from "@/features/page/page-template";

/** 页面状态对应的中文名称。 */
export enum PageStatusName {
  PUBLISHED = "已发布",
  DRAFT = "草稿",
  TO_AUDIT = "待审核",
}

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

/** 页面模板名称。 */
export enum PageTemplateName {
  DEFAULT = "默认",
  FRIENDLY_LINKS = "友情链接",
}

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

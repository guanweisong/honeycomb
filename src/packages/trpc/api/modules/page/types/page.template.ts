/**
 * 页面模板。
 */
export enum PageTemplate {
  DEFAULT = "default",
  FRIENDLY_LINKS = "friendly-links",
}

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
